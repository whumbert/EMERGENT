import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver errors (common with Radix UI components - não afeta funcionalidade)
const originalError = console.error;
console.error = (...args) => {
  // Check if it's a ResizeObserver error
  if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver')) {
    return;
  }
  // Check if it's an Error object with ResizeObserver message
  if (args[0] instanceof Error && args[0].message && args[0].message.includes('ResizeObserver')) {
    return;
  }
  originalError.call(console, ...args);
};

// Also suppress at window level
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver')) {
    e.stopImmediatePropagation();
    return false;
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
