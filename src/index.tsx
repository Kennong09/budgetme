import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// Import Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Import custom CSS overrides
import "./assets/css/custom.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(metric => {
  // You can send the metrics to Vercel Analytics or any other endpoint
});