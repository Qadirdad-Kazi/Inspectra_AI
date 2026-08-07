'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Loader2, Save } from 'lucide-react';
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
  badgeText?: string;
};

type AiGenerateResult = {
  slides: AiSlide[];
  suggestedTheme: string;
  colorPalette: string[];
  generatedBy?: string;
};

function slidesToScreens(slides: AiSlide[], existing?: ArtboardScreen[]): ArtboardScreen[] {
  return slides.map((slide, i) => {
    const prev = existing?.[i];
    const deviceImage = prev?.elements.find((e) => e.type === 'device')?.imageUrl;
    const elements: CanvasElement[] = [
      {
        id: `el-badge-${i}-${Date.now()}`,
        type: 'badge',
        x: 50,
        y: 10,
        text: slide.badgeText || 'Featured',
        color: '#ffffff',
        zIndex: 3,
      },
      {
        id: `el-head-${i}-${Date.now()}`,
        type: 'headline',
        x: 50,
        y: 20,
        text: slide.headline,
        color: slide.textColor || '#ffffff',
        fontSize: 24,
        zIndex: 3,
      },
      {
        id: `el-sub-${i}-${Date.now()}`,
        type: 'subhead',
        x: 50,
        y: 30,
        text: slide.subhead,
        color: '#94a3b8',
        fontSize: 13,
        zIndex: 3,
      },
      {
        id: `el-dev-${i}-${Date.now()}`,
        type: 'device',
        x: 50,
        y: 64,
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

export default function ScreenshotStudioPage() {
  const { user, activeOrgId } = useAuth();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'msstore' | 'web'>('ios');
  const [projectName, setProjectName] = useState('Inspectra Launch Set');
  const [projectId, setProjectId] = useState<string | null>(null);

  const [screens, setScreens] = useState<ArtboardScreen[]>(INITIAL_SCREENS);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('templates');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);

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

  useEffect(() => {
    void refreshEntitlement();
  }, [refreshEntitlement]);

  const handleApplyTemplate = (template: TemplatePreset) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;
      copy[activeScreenIndex] = {
        ...target,
        backgroundColor: template.backgroundColor,
        gradientBackground: template.gradientBackground,
        textColor: template.textColor,
      };
      return copy;
    });
    toast.success(`Applied “${template.name}”`);
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

  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
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
          }),
        },
      );
      if (!data.slides?.length) {
        toast.error('AI returned no slides');
        return;
      }
      setScreens(slidesToScreens(data.slides, screens));
      setActiveScreenIndex(0);
      setSelectedElementId(null);
      setProjectName(params.appName || projectName);
      toast.success(
        data.generatedBy === 'llm'
          ? 'AI layout applied (LLM copy)'
          : 'AI layout applied (template engine)',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI generate failed');
      throw err;
    }
  };

  const handleSave = async () => {
    if (!activeOrgId) return;
    setIsSaving(true);
    try {
      const canvasConfig = { screens, activeScreenIndex, platform };
      if (projectId) {
        await apiFetch(`/organizations/${activeOrgId}/screenshot-studio/projects/${projectId}`, {
          method: 'PATCH',
          orgId: activeOrgId,
          body: JSON.stringify({
            name: projectName,
            platform,
            canvasConfig,
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
            }),
          },
        );
        setProjectId(created.id);
      }
      toast.success('Project saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-artboard-id]'),
      );
      if (!nodes.length) {
        toast.error('No artboards to export');
        return;
      }
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]!;
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: undefined,
        });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}-${i + 1}.png`;
        a.click();
        await new Promise((r) => setTimeout(r, 250));
      }
      toast.success(`Exported ${nodes.length} PNG frame(s)`);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Inspectra Studio"
          description="Design, drag-align, AI-generate, and export App Store & Play Store frames."
        />
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

      <StudioToolbar
        platform={platform}
        setPlatform={setPlatform}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onExport={() => void handleExport()}
        isExporting={isExporting}
        projectName={projectName}
        setProjectName={setProjectName}
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
          onUploadImage={handleUploadImage}
        />
        <StudioCanvas
          screens={screens}
          setScreens={setScreens}
          activeScreenIndex={activeScreenIndex}
          setActiveScreenIndex={setActiveScreenIndex}
          selectedElementId={selectedElementId}
          setSelectedElementId={setSelectedElementId}
          platform={platform}
        />
      </div>

      <StudioAiPanel
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleAiGenerate}
      />
    </div>
  );
}
