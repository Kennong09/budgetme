// Unified color system for all family charts
export const colorSystem = {
  // Progress ranges - consistent across all components
  progress: {
    excellent: '#1cc88a', // Green (90-100%)
    good: '#4e73df',      // Blue (75-89%)
    fair: '#f6c23e',      // Yellow (50-74%)
    poor: '#e74a3b'       // Red (0-49%)
  },

  // Status colors
  status: {
    completed: '#1cc88a',
    in_progress: '#4e73df',
    not_started: '#f6c23e',
    cancelled: '#e74a3b',
    active: '#4e73df',
    pending: '#f6c23e'
  },

  // Semantic colors
  semantic: {
    success: '#1cc88a',
    warning: '#f6c23e',
    danger: '#e74a3b',
    info: '#4e73df',
    primary: '#4e73df',
    secondary: '#6c757d',
    muted: '#858796'
  },

  // Background colors
  background: {
    light: '#f8f9fc',
    white: '#ffffff',
    card: '#ffffff',
    transparent: 'transparent'
  }
};

// Helper function to get color based on progress percentage
export const getProgressColor = (progress: number): string => {
  if (progress >= 90) return colorSystem.progress.excellent;
  if (progress >= 75) return colorSystem.progress.good;
  if (progress >= 50) return colorSystem.progress.fair;
  return colorSystem.progress.poor;
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  return colorSystem.status[normalizedStatus as keyof typeof colorSystem.status] || colorSystem.semantic.muted;
};

// Helper function to get grade based on score
export const getGrade = (score: number) => {
  if (score >= 90) return { grade: 'A+', color: colorSystem.progress.excellent, description: 'Excellent' };
  if (score >= 80) return { grade: 'A', color: colorSystem.progress.good, description: 'Good' };
  if (score >= 70) return { grade: 'B+', color: colorSystem.progress.good, description: 'Good' };
  if (score >= 60) return { grade: 'B', color: colorSystem.progress.fair, description: 'Fair' };
  if (score >= 50) return { grade: 'C', color: colorSystem.progress.fair, description: 'Fair' };
  return { grade: 'D', color: colorSystem.progress.poor, description: 'Needs Improvement' };
};

export default colorSystem;