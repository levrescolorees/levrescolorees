import { useEffect, useRef, useCallback, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface UseAutosaveOptions {
  data: any;
  onSave: () => Promise<void>;
  enabled: boolean; // only after first manual save (has ID)
  debounceMs?: number;
}

export function useAutosave({ data, onSave, enabled, debounceMs = 1500 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSavedRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const currentJson = JSON.stringify(data);

  // Mark as saved externally (after manual save)
  const markSaved = useCallback(() => {
    lastSavedRef.current = JSON.stringify(data);
    setStatus('saved');
  }, [data]);

  // Check dirty
  const isDirty = enabled && lastSavedRef.current !== '' && currentJson !== lastSavedRef.current;

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === '') {
      // First snapshot after enabling
      lastSavedRef.current = currentJson;
      return;
    }
    if (currentJson === lastSavedRef.current) {
      return;
    }

    setStatus('unsaved');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      setStatus('saving');
      try {
        await onSave();
        if (isMountedRef.current) {
          lastSavedRef.current = JSON.stringify(data);
          setStatus('saved');
        }
      } catch {
        if (isMountedRef.current) setStatus('unsaved');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentJson, enabled, debounceMs, onSave, data]);

  // beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  return { status, isDirty, markSaved };
}
