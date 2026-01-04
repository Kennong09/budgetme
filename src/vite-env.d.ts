/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// SVG imports with ?react suffix
declare module '*.svg?react' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default ReactComponent;
}

// Regular SVG imports (as URL)
declare module '*.svg' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_API_URL: string;
  // Legacy CRA env vars (for backwards compatibility)
  readonly REACT_APP_SUPABASE_URL: string;
  readonly REACT_APP_SUPABASE_ANON_KEY: string;
  readonly REACT_APP_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
