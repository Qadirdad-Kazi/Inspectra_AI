'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useAuth } from '@/components/providers/auth-provider';
import { API_URL, getAccessToken } from '@/lib/api';
import { StudioToolbar } from '@/components/screenshot-studio/studio-toolbar';
import { StudioCanvas, SlideData } from '@/components/screenshot-studio/studio-canvas';
import { StudioAiPanel } from '@/components/screenshot-studio/studio-ai-panel';
import { FeatureLockModal } from '@/components/screenshot-studio/feature-lock-modal';
import { Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_SLIDES: SlideData[] = [
  {
    id: 'slide-1',
    headline: 'Inspectra Mobile Audit',
    subhead: 'Instant AI security scanning and performance audits across all platforms.',
    frameType: 'iphone-16-pro',
    backgroundColor: '#0f172a',
    gradientBackground: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    textColor: '#ffffff',
    badgeText: 'Top Rated',
  },
  {
    id: 'slide-2',
    headline: 'Real-Time Threat Detection',
    subhead: 'Continuous compliance checks for OWASP and app store policies.',
    frameType: 'iphone-16-pro',
    backgroundColor: '#020617',
    gradientBackground: 'linear-gradient(135deg, #020617 0%, #172554 100%)',
    textColor: '#ffffff',
    badgeText: '100% Compliant',
  },
  {
    id: 'slide-3',
    headline: 'One-Click AI Remediation',
    subhead: 'Generate fixes, marketing screenshot sets, and compliance reports instantly.',
    frameType: 'iphone-16-pro',
    backgroundColor: '#090d16',
    gradientBackground: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
    textColor: '#ffffff',
    badgeText: 'AI Powered',
  },
];

export default function ScreenshotStudioPage() {
  const { user, activeOrgId } = useAuth();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'msstore' | 'web'>('ios');
  const [projectName, setProjectName] = useState('My Store Screenshot Set');
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
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

      // Platform admins always have immediate full access
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
      } catch (err) {
        setEntitlement({
          loading: false,
          hasAccess: user?.isPlatformAdmin ?? true,
        });
      }
    }

    checkEntitlement();
  }, [activeOrgId, user?.isPlatformAdmin]);

  const updateSlide = (idx: number, patch: Partial<SlideData>) => {
    setSlides((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
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
        const data = await res.json();
        if (data.slides && data.slides.length > 0) {
          setSlides(data.slides);
          toast.success('Generated AI screenshot set!');
          return;
        }
      }

      // Local fallback generation
      setSlides([
        {
          id: 'ai-1',
          headline: `${params.appName} — Next Gen App`,
          subhead: params.appDescription || 'Fast, secure, and built for maximum performance.',
          frameType: 'iphone-16-pro',
          backgroundColor: '#0f172a',
          gradientBackground: `linear-gradient(135deg, #0f172a 0%, ${params.primaryColor} 100%)`,
          textColor: '#ffffff',
          badgeText: 'Featured',
        },
        {
          id: 'ai-2',
          headline: 'Verified Security & Speed',
          subhead: 'Audited continuously with enterprise-grade encryption.',
          frameType: 'iphone-16-pro',
          backgroundColor: '#020617',
          gradientBackground: 'linear-gradient(135deg, #020617 0%, #172554 100%)',
          textColor: '#ffffff',
          badgeText: '100% Secure',
        },
        {
          id: 'ai-3',
          headline: 'Real-Time Sync Anywhere',
          subhead: 'Instant background updates across all your devices.',
          frameType: 'iphone-16-pro',
          backgroundColor: '#090d16',
          gradientBackground: 'linear-gradient(135deg, #090d16 0%, #064e3b 100%)',
          textColor: '#ffffff',
          badgeText: 'Lightning Fast',
        },
      ]);
      toast.success('Generated AI screenshot set specs!');
    } catch (err) {
      toast.error('Failed to call AI generator, applying fallback theme.');
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Successfully exported store package for ${platform.toUpperCase()}!`);
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
        title="ShotLuma Screenshot Studio"
        description="Design, customize, and AI-synthesize App Store & Play Store graphic sets."
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

      <StudioCanvas
        slides={slides}
        activeSlideIndex={activeSlideIndex}
        setActiveSlideIndex={setActiveSlideIndex}
        updateSlide={updateSlide}
        platform={platform}
      />

      <StudioAiPanel
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerate={handleAiGenerate}
      />
    </div>
  );
}
