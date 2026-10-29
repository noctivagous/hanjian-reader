import { useEffect, useState, type RefObject } from 'react';

/**
 * Tracks which anchored element is currently in view inside a scroll
 * container. Returns [activeId, setActiveId] so click navigation can
 * set the active entry optimistically before the scroll settles.
 */
export function useScrollObserver(
  containerRef: RefObject<HTMLElement | null>,
  ids: string[],
  resetKey: string,
): [string | null, (id: string | null) => void] {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const idsKey = ids.join('\n');

  useEffect(() => {
    setActiveId(ids[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || ids.length === 0) return;

    const orderedIds = idsKey.split('\n').filter(Boolean);
    const elements = orderedIds
      .map((id) => root.querySelector(`#${CSS.escape(id)}`))
      .filter((el): el is Element => el !== null);
    if (elements.length === 0) return;

    const byId = new Map(elements.map((el) => [el.id, el]));

    const fallback = () => {
      const rootTop = root.getBoundingClientRect().top;
      let candidate: string | null = null;
      for (const id of orderedIds) {
        const el = byId.get(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= rootTop + 80) candidate = id;
        else break;
      }
      setActiveId(candidate ?? orderedIds[0] ?? null);
    };

    if (typeof IntersectionObserver === 'undefined') {
      fallback();
      return;
    }

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          let best: string | null = null;
          let bestTop = Infinity;
          for (const [id, top] of visible) {
            // Refresh top: entries carry current positions.
            const el = byId.get(id);
            const currentTop = el
              ? el.getBoundingClientRect().top
              : top;
            if (currentTop < bestTop) {
              bestTop = currentTop;
              best = id;
            }
          }
          if (best) setActiveId(best);
        } else {
          fallback();
        }
      },
      {
        root,
        rootMargin: '-80px 0px -55% 0px',
        threshold: 0,
      },
    );

    elements.forEach((el) => observer.observe(el));
    fallback();
    return () => observer.disconnect();
    // idsKey captures ids; containerRef is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, idsKey, resetKey]);

  return [activeId, setActiveId];
}
