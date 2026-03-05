import { useEffect, useRef, useCallback, useState } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved';

interface UseAutosaveOptions {
  data: any;
  onSave: () => Promise<void>;
  enabled: boolean;
  debounceMs?: number;
}

export function useAutosave({ data, onSave, enabled, debounceMs = 1500 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSavedRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const currentJsonRef = useRef<string>('');

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const currentJson = JSON.stringify(data);
  currentJsonRef.current = currentJson;

  const markSaved = useCallback(() => {
    lastSavedRef.current = currentJsonRef.current;
    setStatus('saved');
  }, []);

  const isDirty = enabled && lastSavedRef.current !== '' && currentJson !== lastSavedRef.current;

  useEffect(() => {
    if (!enabled) return;
    if (lastSavedRef.current === '') {
      lastSavedRef.current = currentJson;
      return;
    }
    if (currentJson === lastSavedRef.current) return;

    setStatus('unsaved');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!isMountedRef.current || isSavingRef.current) return;
      isSavingRef.current = true;
      setStatus('saving');
      try {
        await onSaveRef.current();
        if (isMountedRef.current) {
          lastSavedRef.current = currentJsonRef.current;
          setStatus('saved');
        }
      } catch {
        if (isMountedRef.current) setStatus('unsaved');
      } finally {
        isSavingRef.current = false;
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentJson, enabled, debounceMs]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
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
