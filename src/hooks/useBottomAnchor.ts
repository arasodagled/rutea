'use client';
import * as React from 'react';

type Options = { tolerance?: number };

export function useBottomAnchor<T extends HTMLElement>(
  containerRef: React.RefObject<T | null>,
  endRef?: React.RefObject<HTMLElement | null>,
  opts: Options = {}
) {
  const tolerance = opts.tolerance ?? 50; // Changed from 120 to 50
  const [isNearBottom, setIsNearBottom] = React.useState(true);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setIsNearBottom(distance <= tolerance);
    };

    // Initialize and listen
    handleScroll();
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, tolerance]);

  const _doScroll = React.useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const el = containerRef.current;
      if (!el) return;

      // Prefer an endRef if provided (usually more reliable with dynamic content)
      if (endRef?.current) {
        endRef.current.scrollIntoView({ block: 'end', behavior });
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior });
      }
    },
    [containerRef, endRef]
  );

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      // rAF avoids layout thrash while streaming
      requestAnimationFrame(() => _doScroll(behavior));
    },
    [_doScroll]
  );

  const maybeScrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      if (isNearBottom) scrollToBottom(behavior);
    },
    [isNearBottom, scrollToBottom]
  );

  return {
    isNearBottom,
    isUserScrolling: !isNearBottom,
    scrollToBottom,
    maybeScrollToBottom,
  };
}