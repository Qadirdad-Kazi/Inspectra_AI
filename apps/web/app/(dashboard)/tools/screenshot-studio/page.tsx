'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toPng } from 'html-to-image';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/providers/auth-provider';
import { apiFetch } from '@/lib/api';
import { StudioToolbar } from '@/components/screenshot-studio/studio-toolbar';
import {
  StudioCanvas,
  INITIAL_SCREENS,
  type ArtboardScreen,
  type DeviceStyle,
  type CanvasElement,
} from '@/components/screenshot-studio/studio-canvas';
import {
  StudioSidebar,
  type SidebarTab,
  type TemplatePreset,
} from '@/components/screenshot-studio/studio-sidebar';
import { StudioAiPanel } from '@/components/screenshot-studio/studio-ai-panel';
import { FeatureLockModal } from '@/components/screenshot-studio/feature-lock-modal';
import {
  StudioProjectLibrary,
  type StudioProjectListItem,
} from '@/components/screenshot-studio/studio-project-library';
import { useHistoryState } from '@/components/screenshot-studio/use-history-state';
import {
  PLATFORM_EXPORT_SIZE,
  previewArtboardSize,
  fileToDataUrl,
  persistableScreens,
  slugify,
  type StudioPlatform,
} from '@/lib/studio-export';
import { Loader2, Redo2, Save, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type AiSlide = {
  id: string;
  headline: string;
  subhead: string;
  frameType: DeviceStyle;
  backgroundColor: string;
  gradientBackground?: string;
  textColor: string;
  captionMutedColor?: string;
  badgeText?: string;
  imageUrl?: string;
  layout?: string;
  role?: string;
  headlineY?: number;
  deviceY?: number;
  deviceX?: number;
};

type AiGenerateResult = {
  slides: AiSlide[];
  suggestedTheme: string;
  colorPalette: string[];
  generatedBy?: string;
  auditSafe?: boolean;
  creativePolicy?: {
    frameCount: number;
    minFrames: number;
    targetQuality: number;
  };
};

type StoredProject = {
  id: string;
  name: string;
  platform: StudioPlatform;
  canvasConfig?: {
    screens?: ArtboardScreen[];
    activeScreenIndex?: number;
    platform?: StudioPlatform;
  };
};

function slidesToScreens(slides: AiSlide[], existing?: ArtboardScreen[]): ArtboardScreen[] {
  return slides.map((slide, i) => {
    const prev = existing?.[i];
    const deviceImage =
      slide.imageUrl || prev?.elements.find((e) => e.type === 'device')?.imageUrl;
    const headY = slide.headlineY ?? 20;
    const deviceY = slide.deviceY ?? 64;
    const deviceX = slide.deviceX ?? 50;
    const elements: CanvasElement[] = [
      {
        id: `el-badge-${i}-${Date.now()}`,
        type: 'badge',
        x: 50,
        y: Math.max(8, headY - 10),
        text: slide.badgeText || 'Featured',
        color: '#ffffff',
        zIndex: 3,
      },
      {
        id: `el-head-${i}-${Date.now()}`,
        type: 'headline',
        x: 50,
        y: headY,
        text: slide.headline,
        color: slide.textColor || '#ffffff',
        fontSize: 24,
        zIndex: 3,
      },
      {
        id: `el-sub-${i}-${Date.now()}`,
        type: 'subhead',
        x: 50,
        y: headY + 10,
        text: slide.subhead,
        color: slide.captionMutedColor || '#94a3b8',
        fontSize: 13,
        zIndex: 3,
      },
      {
        id: `el-dev-${i}-${Date.now()}`,
        type: 'device',
        x: deviceX,
        y: deviceY,
        deviceStyle: slide.frameType || 'iphone-17-b',
        imageUrl: deviceImage,
        shadowOpacity: 55,
        zIndex: 2,
      },
    ];
    return {
      id: `screen-ai-${i}-${Date.now()}`,
      name: `${String(i + 1).padStart(2, '0')} ${slide.badgeText || `Screen ${i + 1}`}`,
      backgroundColor: slide.backgroundColor,
      gradientBackground: slide.gradientBackground,
      textColor: slide.textColor || '#ffffff',
      widthPx: 1290,
      heightPx: 2796,
      elements,
    };
  });
}

function collectDeviceImages(screens: ArtboardScreen[]): string[] {
  return screens
    .map((s) => s.elements.find((e) => e.type === 'device')?.imageUrl)
    .filter((u): u is string => Boolean(u && !u.startsWith('blob:')));
}

function ScreenshotStudioInner() {
  const { user, activeOrgId } = useAuth();
  const searchParams = useSearchParams();
  const [platform, setPlatform] = useState<StudioPlatform>('ios');
  const [projectName, setProjectName] = useState('Untitled project');
  const [projectId, setProjectId] = useState<string | null>(null);

  const {
    state: screens,
    setState: setScreens,
    replaceState: replaceScreens,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<ArtboardScreen[]>(INITIAL_SCREENS);

  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('templates');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [projects, setProjects] = useState<StudioProjectListItem[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [entitlement, setEntitlement] = useState<{
    loading: boolean;
    hasAccess: boolean;
    reason?: string;
  }>({ loading: true, hasAccess: false });

  const refreshEntitlement = useCallback(async () => {
    if (!activeOrgId) return;
    if (user?.isPlatformAdmin) {
      setEntitlement({
        loading: false,
        hasAccess: true,
        reason: 'Platform Admin — unrestricted',
      });
      return;
    }
    try {
      const data = await apiFetch<{ hasAccess: boolean; reason?: string }>(
        `/organizations/${activeOrgId}/screenshot-studio/entitlement`,
        { orgId: activeOrgId },
      );
      setEntitlement({
        loading: false,
        hasAccess: Boolean(data.hasAccess),
        reason: data.reason,
      });
    } catch (err) {
      setEntitlement({
        loading: false,
        hasAccess: false,
        reason: err instanceof Error ? err.message : 'Could not verify Studio access',
      });
    }
  }, [activeOrgId, user?.isPlatformAdmin]);

  const refreshProjects = useCallback(async () => {
    if (!activeOrgId || !entitlement.hasAccess) return;
    setProjectsLoading(true);
    try {
      const data = await apiFetch<StudioProjectListItem[]>(
        `/organizations/${activeOrgId}/screenshot-studio/projects`,
        { orgId: activeOrgId },
      );
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, [activeOrgId, entitlement.hasAccess]);

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  useEffect(() => {
    if (entitlement.hasAccess) void refreshProjects();
  }, [entitlement.hasAccess, refreshProjects]);

  useEffect(() => {
    const studio = searchParams.get('studio');
    const canceled = searchParams.get('canceled');
    if (studio === '1') {
      toast.success('Studio access unlocked — welcome back');
      void refreshEntitlement();
    } else if (canceled === '1') {
      toast.message('Checkout canceled');
    }
  }, [searchParams, refreshEntitlement]);

  const handleSave = useCallback(async () => {
    if (!activeOrgId) return;
    setIsSaving(true);
    try {
      const needsPersist = screens.some((s) =>
        s.elements.some((e) => e.imageUrl?.startsWith('blob:')),
      );
      const durableScreens = needsPersist ? await persistableScreens(screens) : screens;
      if (needsPersist) {
        replaceScreens(durableScreens);
      }
      const sized = PLATFORM_EXPORT_SIZE[platform];
      const canvasConfig = {
        screens: durableScreens.map((s) => ({
          ...s,
          widthPx: sized.width,
          heightPx: sized.height,
        })),
        activeScreenIndex,
        platform,
      };
      const exportSettings = {
        width: sized.width,
        height: sized.height,
        label: sized.label,
      };
      if (projectId) {
        await apiFetch(`/organizations/${activeOrgId}/screenshot-studio/projects/${projectId}`, {
          method: 'PATCH',
          orgId: activeOrgId,
          body: JSON.stringify({
            name: projectName,
            platform,
            canvasConfig,
            exportSettings,
          }),
        });
      } else {
        const created = await apiFetch<{ id: string }>(
          `/organizations/${activeOrgId}/screenshot-studio/projects`,
          {
            method: 'POST',
            orgId: activeOrgId,
            body: JSON.stringify({
              name: projectName,
              platform,
              canvasConfig,
              exportSettings,
            }),
          },
        );
        setProjectId(created.id);
      }
      toast.success('Project saved');
      void refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }, [
    activeOrgId,
    screens,
    replaceScreens,
    platform,
    activeScreenIndex,
    projectId,
    projectName,
    refreshProjects,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 's') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, handleSave]);

  const handleApplyTemplate = (template: TemplatePreset) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;
      const prevDevice = target.elements.find((el) => el.type === 'device');
      const stamp = Date.now();
      const elements: CanvasElement[] = [
        {
          id: `el-badge-${stamp}`,
          type: 'badge',
          x: 50,
          y: template.badgeY ?? 10,
          text: template.badgeText || 'Featured',
          color: template.textColor,
          zIndex: 3,
        },
        {
          id: `el-head-${stamp}`,
          type: 'headline',
          x: 50,
          y: template.headlineY ?? 20,
          text: template.headline || 'New headline',
          color: template.textColor,
          fontSize: 24,
          zIndex: 3,
        },
        {
          id: `el-sub-${stamp}`,
          type: 'subhead',
          x: 50,
          y: template.subheadY ?? 30,
          text: template.subhead || 'Supporting line goes here.',
          color:
            template.textColor === '#ffffff' || template.textColor === '#fef3c7'
              ? '#94a3b8'
              : '#57534e',
          fontSize: 13,
          zIndex: 3,
        },
        {
          id: `el-dev-${stamp}`,
          type: 'device',
          x: template.deviceX ?? 50,
          y: template.deviceY ?? 64,
          deviceStyle: template.deviceStyle || prevDevice?.deviceStyle || 'iphone-17-b',
          imageUrl: prevDevice?.imageUrl,
          shadowOpacity: 55,
          zIndex: 2,
        },
      ];
      copy[activeScreenIndex] = {
        ...target,
        backgroundColor: template.backgroundColor,
        gradientBackground: template.gradientBackground,
        textColor: template.textColor,
        elements,
      };
      return copy;
    });
    setSelectedElementId(null);
    toast.success(`Applied “${template.name}” layout`);
  };

  const handleAddMockup = (style: DeviceStyle) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;
      const existingDevice = target.elements.find((el) => el.type === 'device');
      if (existingDevice) {
        copy[activeScreenIndex] = {
          ...target,
          elements: target.elements.map((el) =>
            el.type === 'device' ? { ...el, deviceStyle: style } : el,
          ),
        };
        setSelectedElementId(existingDevice.id);
      } else {
        const newDevice: CanvasElement = {
          id: `el-dev-${Date.now()}`,
          type: 'device',
          x: 50,
          y: 64,
          deviceStyle: style,
          shadowOpacity: 55,
          zIndex: 2,
        };
        copy[activeScreenIndex] = {
          ...target,
          elements: [...target.elements, newDevice],
        };
        setSelectedElementId(newDevice.id);
      }
      return copy;
    });
  };

  const handleAddShape = (shapeId: string) => {
    const newShape: CanvasElement = {
      id: `el-shape-${Date.now()}`,
      type: 'shape',
      shapeType: shapeId,
      x: 50,
      y: 48,
      color: '#38bdf8',
      zIndex: 4,
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) copy[activeScreenIndex] = { ...target, elements: [...target.elements, newShape] };
      return copy;
    });
    setSelectedElementId(newShape.id);
  };

  const handleAddIcon = (iconId: string) => {
    const newIcon: CanvasElement = {
      id: `el-icon-${Date.now()}`,
      type: 'icon',
      iconId,
      x: 50,
      y: 42,
      color: '#2dd4bf',
      zIndex: 4,
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) copy[activeScreenIndex] = { ...target, elements: [...target.elements, newIcon] };
      return copy;
    });
    setSelectedElementId(newIcon.id);
  };

  const handleAddText = (type: 'headline' | 'subhead' | 'badge') => {
    const newText: CanvasElement = {
      id: `el-text-${Date.now()}`,
      type,
      x: 50,
      y: type === 'badge' ? 10 : type === 'headline' ? 20 : 30,
      text:
        type === 'badge'
          ? 'Featured'
          : type === 'headline'
            ? 'New headline'
            : 'Supporting line goes here.',
      color: '#ffffff',
      fontSize: type === 'headline' ? 24 : type === 'subhead' ? 13 : 11,
      zIndex: 5,
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) copy[activeScreenIndex] = { ...target, elements: [...target.elements, newText] };
      return copy;
    });
    setSelectedElementId(newText.id);
  };

  const handleUploadImage = async (file: File) => {
    try {
      const url = await fileToDataUrl(file);
      setScreens((prev) => {
        const copy = [...prev];
        const target = copy[activeScreenIndex];
        if (!target) return prev;
        const deviceEl = target.elements.find((el) => el.type === 'device');
        if (deviceEl) {
          copy[activeScreenIndex] = {
            ...target,
            elements: target.elements.map((el) =>
              el.type === 'device' ? { ...el, imageUrl: url } : el,
            ),
          };
          setSelectedElementId(deviceEl.id);
        } else {
          const newDevice: CanvasElement = {
            id: `el-dev-${Date.now()}`,
            type: 'device',
            x: 50,
            y: 64,
            deviceStyle: platform === 'android' ? 'android-pixel' : 'iphone-17-b',
            imageUrl: url,
            shadowOpacity: 55,
            zIndex: 2,
          };
          copy[activeScreenIndex] = {
            ...target,
            elements: [...target.elements, newDevice],
          };
          setSelectedElementId(newDevice.id);
        }
        return copy;
      });
      toast.success('Screenshot placed in device frame');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleApplyBackground = (bg: { gradient?: string; color?: string }) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;
      copy[activeScreenIndex] = {
        ...target,
        gradientBackground: bg.gradient || '',
        backgroundColor: bg.color || target.backgroundColor,
      };
      return copy;
    });
  };

  const handleAiGenerate = async (params: {
    appName: string;
    appDescription: string;
    theme: string;
    primaryColor: string;
  }) => {
    if (!activeOrgId) return;
    try {
      const data = await apiFetch<AiGenerateResult>(
        `/organizations/${activeOrgId}/screenshot-studio/ai-generate`,
        {
          method: 'POST',
          orgId: activeOrgId,
          body: JSON.stringify({
            appName: params.appName,
            appDescription: params.appDescription,
            targetPlatform: platform,
            theme: params.theme,
            primaryColor: params.primaryColor,
            rawScreenshotUrls: collectDeviceImages(screens).slice(0, 8),
          }),
        },
      );
      if (!data.slides?.length) {
        toast.error('AI returned no slides');
        return;
      }
      const sized = PLATFORM_EXPORT_SIZE[platform];
      const next = slidesToScreens(data.slides, screens).map((s) => ({
        ...s,
        widthPx: sized.width,
        heightPx: sized.height,
      }));
      replaceScreens(next);
      setActiveScreenIndex(0);
      setSelectedElementId(null);
      setProjectName(params.appName || projectName);
      toast.success(
        data.generatedBy === 'llm'
          ? `Layout + LLM copy applied · ${data.slides.length} frames`
          : data.generatedBy === 'hybrid'
            ? `Layout + draft copy applied · ${data.slides.length} frames`
            : `Template layout applied (AI offline) · ${data.slides.length} frames — review copy before publishing`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generate failed');
      throw err;
    }
  };

  const handleOpenProject = async (id: string) => {
    if (!activeOrgId) return;
    try {
      const project = await apiFetch<StoredProject>(
        `/organizations/${activeOrgId}/screenshot-studio/projects/${id}`,
        { orgId: activeOrgId },
      );
      const cfg = project.canvasConfig;
      const loadedScreens = cfg?.screens?.length ? cfg.screens : INITIAL_SCREENS;
      replaceScreens(loadedScreens);
      setActiveScreenIndex(cfg?.activeScreenIndex ?? 0);
      setSelectedElementId(null);
      setProjectId(project.id);
      setProjectName(project.name);
      setPlatform((cfg?.platform || project.platform || 'ios') as StudioPlatform);
      toast.success(`Opened “${project.name}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!activeOrgId) return;
    if (!window.confirm('Delete this Studio project?')) return;
    try {
      await apiFetch(`/organizations/${activeOrgId}/screenshot-studio/projects/${id}`, {
        method: 'DELETE',
        orgId: activeOrgId,
      });
      if (projectId === id) {
        setProjectId(null);
        replaceScreens(INITIAL_SCREENS);
        setProjectName('Untitled project');
        setActiveScreenIndex(0);
      }
      toast.success('Project deleted');
      void refreshProjects();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleNewProject = () => {
    setProjectId(null);
    replaceScreens(INITIAL_SCREENS);
    setProjectName('Untitled project');
    setActiveScreenIndex(0);
    setSelectedElementId(null);
    toast.message('New blank project');
  };

  const handleExport = async () => {
    const devicesMissingShot = screens.flatMap((s) =>
      s.elements.filter((el) => el.type === 'device' && !el.imageUrl),
    );
    if (devicesMissingShot.length > 0) {
      toast.error(
        `Upload screenshots into ${devicesMissingShot.length} device frame(s) before exporting. Empty “Add screenshot” frames are not store-ready.`,
      );
      return;
    }

    setIsExporting(true);
    setSelectedElementId(null);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-artboard-id]'));
      if (!nodes.length) {
        toast.error('No artboards to export');
        return;
      }
      const sized = PLATFORM_EXPORT_SIZE[platform];
      const preview = previewArtboardSize(platform);
      const pixelRatio = sized.width / preview.width;
      const base = slugify(projectName);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio,
          backgroundColor: undefined,
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${base}-${String(i + 1).padStart(2, '0')}-${sized.width}x${sized.height}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 280));
      }
      toast.success(`Exported ${nodes.length} store-size PNG(s) · ${sized.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePurchase = async (planId: string, customDays?: number) => {
    if (!activeOrgId) return;
    setBuyingPlanId(planId);
    try {
      const result = await apiFetch<{
        url: string | null;
        message: string | null;
        expiresAt?: string;
      }>(`/organizations/${activeOrgId}/billing/studio/checkout`, {
        method: 'POST',
        orgId: activeOrgId,
        body: JSON.stringify({
          planId,
          customDays,
          successUrl: `${window.location.origin}/tools/screenshot-studio?studio=1`,
          cancelUrl: `${window.location.origin}/tools/screenshot-studio?canceled=1`,
        }),
      });
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      toast.success(result.message ?? 'Studio unlocked');
      await refreshEntitlement();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBuyingPlanId(null);
    }
  };

  if (entitlement.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!entitlement.hasAccess) {
    return (
      <div className="mx-auto max-w-4xl py-10">
        <PageHeader
          title="Inspectra Studio"
          description="Store screenshot builder — separate from audits."
        />
        <FeatureLockModal
          reason={entitlement.reason}
          buyingPlanId={buyingPlanId}
          onPurchase={handlePurchase}
        />
      </div>
    );
  }

  const exportLabel = PLATFORM_EXPORT_SIZE[platform].label;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Inspectra Studio"
          description={`Design, AI-compose, and export store frames · ${exportLabel}`}
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canUndo}
            onClick={undo}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canRedo}
            onClick={redo}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
            variant="outline"
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="ml-2">Save project</span>
          </Button>
        </div>
      </div>

      <StudioProjectLibrary
        projects={projects}
        loading={projectsLoading}
        activeProjectId={projectId}
        onRefresh={() => void refreshProjects()}
        onOpen={(id) => void handleOpenProject(id)}
        onDelete={(id) => void handleDeleteProject(id)}
        onNew={handleNewProject}
      />

      <StudioToolbar
        platform={platform}
        setPlatform={(p) => {
          setPlatform(p);
          const sized = PLATFORM_EXPORT_SIZE[p];
          setScreens((prev) =>
            prev.map((s) => ({ ...s, widthPx: sized.width, heightPx: sized.height })),
          );
        }}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onExport={() => void handleExport()}
        isExporting={isExporting}
        projectName={projectName}
        setProjectName={setProjectName}
        exportLabel={exportLabel}
      />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <StudioSidebar
          activeTab={activeSidebarTab}
          setActiveTab={setActiveSidebarTab}
          onApplyTemplate={handleApplyTemplate}
          onAddMockup={handleAddMockup}
          onAddShape={handleAddShape}
          onAddIcon={handleAddIcon}
          onAddText={handleAddText}
          onApplyBackground={handleApplyBackground}
          onUploadImage={(file) => void handleUploadImage(file)}
        />
        <StudioCanvas
          screens={screens}
          setScreens={setScreens}
          activeScreenIndex={activeScreenIndex}
          setActiveScreenIndex={setActiveScreenIndex}
          selectedElementId={selectedElementId}
          setSelectedElementId={setSelectedElementId}
          platform={platform}
          cleanExport={isExporting}
        />
      </div>

      <StudioAiPanel
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleAiGenerate}
        screenshotCount={collectDeviceImages(screens).length}
      />
    </div>
  );
}

export default function ScreenshotStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <ScreenshotStudioInner />
    </Suspense>
  );
}
