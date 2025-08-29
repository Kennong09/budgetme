import { useEffect, RefObject } from "react";

/**
 * Custom hook to handle clicking outside of a referenced element
 * @param refs - Array of refs or single ref to elements to watch
 * @param handler - Callback function to execute when clicking outside
 * @param enabled - Whether the hook is enabled (default: true)
 */
export const useClickOutside = (
  refs: RefObject<HTMLElement> | RefObject<HTMLElement>[],
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      
      // Check if the click was outside all referenced elements
      const isOutside = refsArray.every(ref => 
        ref.current && !ref.current.contains(event.target as Node)
      );
      
      if (isOutside) {
        handler(event);
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [refs, handler, enabled]);
};

export default useClickOutside;