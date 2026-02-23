import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ThemeSettings } from '@/theme/defaultTheme';

const VIEWPORTS = [
  { label: 'Desktop', width: 1280, icon: Monitor },
  { label: 'Tablet', width: 768, icon: Tablet },
  { label: 'Mobile', width: 375, icon: Smartphone },
] as const;

interface ThemePreviewFrameProps {
  draft: ThemeSettings | null;
}

const ThemePreviewFrame = ({ draft }: ThemePreviewFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState(1280);
  const [scale, setScale] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Stable channel id per mount
  const channelId = useMemo(() => crypto.randomUUID(), []);

  // Build iframe src
  const previewUrl = useMemo(() => {
    const base = window.location.origin;
    const parentParams = new URLSearchParams(window.location.search);
    const params = new URLSearchParams();
    parentParams.forEach((value, key) => {
      if (key !== 'theme_preview') params.set(key, value);
    });
    params.set('theme_preview', '1');
    return `${base}/?${params.toString()}`;
  }, []);

  // ── Scale calculation ──────────────────────────────────
  const updateScale = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const available = wrapper.clientWidth - 32;
    setScale(Math.min(1, available / viewport));
  }, [viewport]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  // ── Handshake: listen for THEME_PREVIEW_READY ──────────
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'THEME_PREVIEW_READY' && e.data?.channelId === channelId) {
        if (import.meta.env.DEV) console.log('[ThemePreview] READY received', channelId);
        setIsReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [channelId]);

  // ── On iframe load, retry INIT until READY ─────────────
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRetry = useCallback(() => {
    if (retryRef.current) {
      clearInterval(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  // Stop retry once ready
  useEffect(() => {
    if (isReady) stopRetry();
  }, [isReady, stopRetry]);

  // Cleanup on unmount
  useEffect(() => stopRetry, [stopRetry]);

  const handleIframeLoad = useCallback(() => {
    setIsReady(false);
    stopRetry();
    const sendInit = () => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      if (import.meta.env.DEV) console.log('[ThemePreview] sending INIT', channelId);
      iframe.contentWindow.postMessage(
        { type: 'THEME_PREVIEW_INIT', channelId },
        '*'
      );
    };
    // Send immediately + retry every 300ms until READY
    sendInit();
    retryRef.current = setInterval(sendInit, 300);
  }, [channelId, stopRetry]);

  // ── Send draft whenever it changes & iframe is ready ───
  const draftRef = useRef(draft);
  draftRef.current = draft;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow || !isReady) return;

    if (draft) {
      if (import.meta.env.DEV) console.log('[ThemePreview] sending APPLY_THEME_DRAFT');
      iframe.contentWindow.postMessage(
        { type: 'APPLY_THEME_DRAFT', channelId, theme: draft },
        '*'
      );
    } else {
      iframe.contentWindow.postMessage(
        { type: 'RESET_THEME_TO_SAVED', channelId },
        '*'
      );
    }
  }, [draft, isReady, channelId]);

  const iframeHeight = 2400; // tall enough for full page scroll

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border bg-muted/30">
        {VIEWPORTS.map(v => (
          <Button
            key={v.width}
            variant={viewport === v.width ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewport(v.width)}
            className="gap-1.5"
          >
            <v.icon className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">{v.label}</span>
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {viewport}px · {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Preview area */}
      <div ref={wrapperRef} className="flex-1 overflow-auto bg-muted/20 flex justify-center p-4">
        <div
          style={{
            width: viewport * scale,
            height: iframeHeight * scale,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <iframe
            ref={iframeRef}
            src={previewUrl}
            onLoad={handleIframeLoad}
            title="Theme Preview"
            style={{
              width: viewport,
              height: iframeHeight,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              position: 'absolute',
              top: 0,
              left: 0,
              border: 'none',
            }}
            className="shadow-lg rounded-lg overflow-hidden bg-background"
          />
        </div>
      </div>
    </div>
  );
};

export default ThemePreviewFrame;
