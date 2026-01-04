import React, { FC, useEffect, memo } from "react";

interface MetaProps {
  title?: string;
}

const Meta: FC<MetaProps> = ({ title = "BudgetMe - Personal Finance Tracker" }) => {
  useEffect(() => {
    // Update the document title
    document.title = title;
    
    // Ensure we have proper viewport meta tag for responsiveness
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    
    if (!viewportMeta) {
      viewportMeta = document.createElement('meta');
      viewportMeta.setAttribute('name', 'viewport');
      document.head.appendChild(viewportMeta);
    }
    
    // Set viewport for responsive design
    viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
    
    // Add theme-color meta for mobile browser UI
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    
    // Set theme color to match app primary color
    themeColorMeta.setAttribute('content', '#4e73df');
    
    // Clean up function is not needed as these meta tags should persist
  }, [title]);

  // This component doesn't render anything visible
  return null;
};

// Memoize Meta component for performance
export default memo(Meta); 