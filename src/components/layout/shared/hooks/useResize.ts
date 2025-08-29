import { useState, useEffect } from "react";

export interface ResizeState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowWidth: number;
  windowHeight: number;
}

/**
 * Custom hook to manage responsive behavior and window resize events
 * @param mobileBreakpoint - Width in pixels for mobile breakpoint (default: 768)
 * @param tabletBreakpoint - Width in pixels for tablet breakpoint (default: 992)
 * @returns ResizeState object with responsive flags and window dimensions
 */
export const useResize = (
  mobileBreakpoint: number = 768,
  tabletBreakpoint: number = 992
): ResizeState => {
  const [state, setState] = useState<ResizeState>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      isMobile: width < mobileBreakpoint,
      isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: width >= tabletBreakpoint,
      windowWidth: width,
      windowHeight: height
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setState({
        isMobile: width < mobileBreakpoint,
        isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
        isDesktop: width >= tabletBreakpoint,
        windowWidth: width,
        windowHeight: height
      });
    };

    // Add event listener
    window.addEventListener("resize", handleResize);
    
    // Call immediately to set initial state
    handleResize();
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileBreakpoint, tabletBreakpoint]);

  return state;
};

export default useResize;