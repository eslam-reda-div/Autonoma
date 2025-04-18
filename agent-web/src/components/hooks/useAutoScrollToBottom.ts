import { useEffect, type RefObject, useState, useCallback } from "react";

export const useAutoScrollToBottom = (
  elementRef: RefObject<HTMLElement>,
  enabled = true,
): void => {
  const [shouldAutoScroll, setShouldAutoScroll] = useState(enabled);

  const isScrolledToBottom = useCallback((element: HTMLElement) => {
    const threshold = 10;
    return (
      element.scrollHeight - element.scrollTop - element.clientHeight <=
      threshold
    );
  }, []);

  useEffect(() => {
    if (!elementRef.current) return;
    const element = elementRef.current;

    const scrollToBottom = () => {
      if (shouldAutoScroll && enabled) {
        element.scrollTop = element.scrollHeight;
      }
    };

    const handleScroll = () => {
      if (!enabled) return;

      if (isScrolledToBottom(element)) {
        setShouldAutoScroll(true);
      } else {
        setShouldAutoScroll(false);
      }
    };

    scrollToBottom();

    const observer = new MutationObserver(scrollToBottom);
    observer.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    element.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", handleScroll);
    };
  }, [elementRef, enabled, shouldAutoScroll, isScrolledToBottom]);

  useEffect(() => {
    setShouldAutoScroll(enabled);
  }, [enabled]);
};
