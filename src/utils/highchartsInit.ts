// Define a minimal type for Highcharts
interface HighchartsStatic {
  chart: (options: any) => any;
  setOptions: (options: any) => void;
  [key: string]: any;
}

// Declare the global Highcharts object
declare global {
  interface Window {
    Highcharts?: HighchartsStatic;
  }
}

// Use the global Highcharts object loaded from CDN in index.html
// with fallback to empty object if not available to prevent errors
const Highcharts: HighchartsStatic = window.Highcharts || {
  // Provide placeholder methods to prevent errors
  chart: () => ({}),
  setOptions: () => {},
};

// No need to initialize modules as they're loaded via CDN

export default Highcharts;
