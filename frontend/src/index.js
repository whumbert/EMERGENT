import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver errors (common with Radix UI components)
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop completed with undelivered notifications|ResizeObserver loop limit exceeded)]/;
const originalError = console.error;
console.error = (...args) => {
  const firstArg = args[0];
  if (typeof firstArg === 'string' && firstArg.includes('ResizeObserver')) {
    return;
  }
  originalError.call(console, ...args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
