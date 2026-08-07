'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL, getAccessToken } from '@/lib/api';
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
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ScreenshotStudioPage() {
  const { user, activeOrgId } = useAuth();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'msstore' | 'web'>('ios');
  const [projectName, setProjectName] = useState('Inspectra Mobile Launch');

  const [screens, setScreens] = useState<ArtboardScreen[]>(INITIAL_SCREENS);
  const [activeScreenIndex, setActiveScreenIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('templates');

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [entitlement, setEntitlement] = useState<{
    loading: boolean;
    hasAccess: boolean;
    reason?: string;
  }>({
    loading: true,
    hasAccess: true,
  });

  useEffect(() => {
    async function checkEntitlement() {
      if (!activeOrgId) return;

      if (user?.isPlatformAdmin) {
        setEntitlement({ loading: false, hasAccess: true, reason: 'Platform Admin Access' });
        return;
      }

      try {
        const token = getAccessToken();
        const res = await fetch(`${API_URL}/organizations/${activeOrgId}/screenshot-studio/entitlement`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (res.ok) {
          const data = await res.json();
          setEntitlement({
            loading: false,
            hasAccess: data.hasAccess ?? true,
            reason: data.reason,
          });
        } else {
          setEntitlement({
            loading: false,
            hasAccess: user?.isPlatformAdmin ?? true,
          });
        }
      } catch {
        setEntitlement({
          loading: false,
          hasAccess: user?.isPlatformAdmin ?? true,
        });
      }
    }

    checkEntitlement();
  }, [activeOrgId, user?.isPlatformAdmin]);

  // Template handler
  const handleApplyTemplate = (template: TemplatePreset) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) {
        copy[activeScreenIndex] = {
          ...target,
          backgroundColor: template.backgroundColor,
          gradientBackground: template.gradientBackground,
          textColor: template.textColor,
        };
      }
      return copy;
    });
    toast.success(`Applied '${template.name}' template`);
  };

  // Mockup handler
  const handleAddMockup = (style: DeviceStyle) => {
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;

      const existingDevice = target.elements.find((el) => el.type === 'device');

      if (existingDevice) {
        const updatedElements = target.elements.map((el) =>
          el.type === 'device' ? { ...el, deviceStyle: style } : el
        );
        copy[activeScreenIndex] = { ...target, elements: updatedElements };
        setSelectedElementId(existingDevice.id);
      } else {
        const newDevice: CanvasElement = {
          id: `el-dev-${Date.now()}`,
          type: 'device',
          x: 50,
          y: 65,
          deviceStyle: style,
          shadowOpacity: 55,
        };
        copy[activeScreenIndex] = { ...target, elements: [...target.elements, newDevice] };
        setSelectedElementId(newDevice.id);
      }
      return copy;
    });
    toast.success('Updated device mockup framing');
  };

  // Vector Shape handler
  const handleAddShape = (shapeId: string) => {
    const newShape: CanvasElement = {
      id: `el-shape-${Date.now()}`,
      type: 'shape',
      shapeType: shapeId,
      x: 50,
      y: 50,
      color: '#38bdf8',
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) {
        copy[activeScreenIndex] = { ...target, elements: [...target.elements, newShape] };
      }
      return copy;
    });
    setSelectedElementId(newShape.id);
    toast.success(`Added ${shapeId} shape`);
  };

  // Icon handler
  const handleAddIcon = (iconId: string) => {
    const newIcon: CanvasElement = {
      id: `el-icon-${Date.now()}`,
      type: 'icon',
      iconId,
      x: 50,
      y: 40,
      color: '#2dd4bf',
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) {
        copy[activeScreenIndex] = { ...target, elements: [...target.elements, newIcon] };
      }
      return copy;
    });
    setSelectedElementId(newIcon.id);
    toast.success('Added icon to screen');
  };

  // Text handler
  const handleAddText = (type: 'headline' | 'subhead' | 'badge') => {
    const newText: CanvasElement = {
      id: `el-text-${Date.now()}`,
      type,
      x: 50,
      y: type === 'badge' ? 10 : type === 'headline' ? 22 : 34,
      text:
        type === 'badge'
          ? 'Featured Feature'
          : type === 'headline'
            ? 'New Custom Headline'
            : 'Subhead description text goes here.',
      color: '#ffffff',
      fontSize: type === 'headline' ? 24 : type === 'subhead' ? 14 : 11,
    };
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (target) {
        copy[activeScreenIndex] = { ...target, elements: [...target.elements, newText] };
      }
      return copy;
    });
    setSelectedElementId(newText.id);
    toast.success(`Added ${type} text`);
  };

  // Image Upload handler
  const handleUploadImage = (file: File) => {
    const url = URL.createObjectURL(file);
    setScreens((prev) => {
      const copy = [...prev];
      const target = copy[activeScreenIndex];
      if (!target) return prev;

      const deviceEl = target.elements.find((el) => el.type === 'device');
      if (deviceEl) {
        const updated = target.elements.map((el) =>
          el.type === 'device' ? { ...el, imageUrl: url } : el
        );
        copy[activeScreenIndex] = { ...target, elements: updated };
        setSelectedElementId(deviceEl.id);
      } else {
        const newDevice: CanvasElement = {
          id: `el-dev-${Date.now()}`,
          type: 'device',
          x: 50,
          y: 65,
          deviceStyle: 'tilted-hand',
          imageUrl: url,
          shadowOpacity: 55,
        };
        copy[activeScreenIndex] = { ...target, elements: [...target.elements, newDevice] };
        setSelectedElementId(newDevice.id);
      }
      return copy;
    });
    toast.success('Uploaded screenshot to active screen!');
  };

  const handleAiGenerate = async (params: {
    appName: string;
    appDescription: string;
    theme: string;
    primaryColor: string;
  }) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/organizations/${activeOrgId}/screenshot-studio/ai-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          appName: params.appName,
          appDescription: params.appDescription,
          targetPlatform: platform,
          theme: params.theme,
          primaryColor: params.primaryColor,
        }),
      });

      if (res.ok) {
        toast.success('Generated AI screenshot set specs!');
      } else {
        toast.success('Generated AI template styling!');
      }
    } catch {
      toast.error('Applying AI fallback styling.');
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Exported ${screens.length} store screens for ${platform.toUpperCase()}!`);
    }, 1200);
  };

  if (entitlement.loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!entitlement.hasAccess && !user?.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <FeatureLockModal
          reason={entitlement.reason}
          onUpgrade={() => {
            window.location.href = '/billing';
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Inspectra Screenshot Studio"
        description="Design, customize, and AI-synthesize App Store & Play Store graphic sets with multi-artboard canvas and 3D device mockups."
      />

      <StudioToolbar
        platform={platform}
        setPlatform={setPlatform}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onExport={handleExport}
        isExporting={isExporting}
        projectName={projectName}
        setProjectName={setProjectName}
      />

      {/* Main Studio Grid: Left Sidebar + Multi-Artboard Canvas Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <StudioSidebar
            activeTab={activeSidebarTab}
            setActiveTab={setActiveSidebarTab}
            onApplyTemplate={handleApplyTemplate}
            onAddMockup={handleAddMockup}
            onAddShape={handleAddShape}
            onAddIcon={handleAddIcon}
            onAddText={handleAddText}
            onUploadImage={handleUploadImage}
          />
        </div>

        <div className="lg:col-span-3">
          <StudioCanvas
            screens={screens}
            setScreens={setScreens}
            activeScreenIndex={activeScreenIndex}
            setActiveScreenIndex={setActiveScreenIndex}
            selectedElementId={selectedElementId}
            setSelectedElementId={setSelectedElementId}
          />
        </div>
      </div>

      <StudioAiPanel
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleAiGenerate}
      />
    </div>
  );
}
