import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// Import Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Import custom CSS overrides
import "./assets/css/custom.css";
import App from "./App";
import { Analytics } from '@vercel/analytics/react';

// Import SB Admin JS
import "./utils/sbAdmin";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
