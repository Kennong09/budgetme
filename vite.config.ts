import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Define global constants for CRA compatibility
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  plugins: [
    react({
      // Use automatic JSX runtime
      jsxRuntime: 'automatic'
    }),
    svgr({
      // Enable SVG as React components with default export
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: false,
        titleProp: true
      },
      include: '**/*.svg?react'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  // Development server config
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true
    }
  },
  // Build optimizations
  build: {
    // Output to 'build' directory for Vercel compatibility (CRA default)
    outDir: 'build',
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable minification
    minify: 'esbuild',
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['chart.js', 'react-chartjs-2', 'recharts', 'highcharts', 'highcharts-react-official'],
          'ui-vendor': ['react-bootstrap', 'lucide-react', 'react-icons'],
          'utils-vendor': ['date-fns', 'axios', 'papaparse']
        }
      }
    },
    // Generate source maps for debugging
    sourcemap: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  // Optimize dependencies
  optimizeDeps: {
    // Only scan the main entry point
    entries: ['index.html'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'chart.js',
      'react-chartjs-2',
      'recharts',
      'highcharts',
      'highcharts-react-official',
      'axios',
      'date-fns',
      '@supabase/supabase-js',
      'pdfmake/build/pdfmake',
      'pdfmake/build/vfs_fonts'
    ],
    // Exclude large dependencies that don't need pre-bundling
    exclude: ['@prisma/client']
  },
  // Environment variable prefix (Vite uses VITE_ instead of REACT_APP_)
  envPrefix: ['VITE_', 'REACT_APP_'],
  // CSS optimization
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    }
  }
}));
