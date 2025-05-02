"use client";

import { useState, useEffect } from 'react';

/**
 * A hook that returns a boolean indicating whether the window matches the given media query.
 * This is useful for implementing responsive behavior in components.
 * 
 * @param query The media query to match (e.g., "(max-width: 640px)")
 * @returns A boolean indicating whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with null and update after component mount to avoid hydration mismatch
  const [matches, setMatches] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // Mark component as mounted to avoid hydration mismatch
    setMounted(true);
    
    // Create media query list
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);
    
    // Define listener for changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener
    media.addEventListener('change', listener);
    
    // Clean up listener on unmount
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);
  
  // Return false during SSR to avoid hydration mismatch
  return mounted ? matches : false;
}