import { useRef, useState, useEffect, useCallback } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const channelIdRef = useRef(crypto.randomUUID());
  const [viewport, setViewport] = useState(1280);
  const [status, setStatus] = useState<'connecting' | 'ready' | 'error'>('connecting');
  const lastSentRef = useRef<string>('');
  const rafRef = useRef<number>(0);

  // Listen for READY from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'THEME_PREVIEW_READY' && e.data?.channelId === channelIdRef.current) {
        setStatus('ready');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Send INIT when iframe loads
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    setStatus('connecting');
    iframe.contentWindow.postMessage({ type: 'THEME_PREVIEW_INIT', channelId: channelIdRef.current }, '*');
    // Timeout for error
    setTimeout(() => {
      setStatus(prev => prev === 'connecting' ? 'error' : prev);
    }, 5000);
  }, []);

  // Send draft to iframe (throttled)
  useEffect(() => {
    if (status !== 'ready' || !draft) return;
    const serialized = JSON.stringify(draft);
    if (serialized === lastSentRef.current) return;

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'APPLY_THEME_DRAFT',
        channelId: channelIdRef.current,
        theme: draft,
      }, '*');
      lastSentRef.current = serialized;
    });
  }, [draft, status]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'RESET_THEME_TO_SAVED',
        channelId: channelIdRef.current,
      }, '*');
    };
  }, []);

  const previewUrl = `${window.location.origin}/?theme_preview=1`;

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
        <div className="ml-auto">
          <Badge variant={status === 'ready' ? 'default' : status === 'error' ? 'destructive' : 'secondary'} className="text-xs">
            {status === 'ready' ? 'Pronto' : status === 'error' ? 'Erro' : 'Conectando...'}
          </Badge>
        </div>
      </div>

      {/* iframe */}
      <div className="flex-1 overflow-auto bg-muted/20 flex justify-center p-4">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          onLoad={handleIframeLoad}
          style={{ width: viewport, maxWidth: '100%', height: '100%', minHeight: '600px' }}
          className="border border-border rounded-lg bg-background shadow-soft transition-all duration-300"
          title="Preview da Loja"
        />
      </div>
    </div>
  );
};

export default ThemePreviewFrame;
