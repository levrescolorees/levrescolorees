import { useRef, useState, useEffect } from 'react';

/** Returns ref + className. Attach ref to element; add className for CSS transition. */
export function useAnimateOnView(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => setVisible(true), delay);
          } else {
            setVisible(true);
          }
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const className = visible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-5';

  return { ref, className };
}
