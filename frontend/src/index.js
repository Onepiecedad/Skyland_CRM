import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { registerServiceWorker, setupInstallPrompt } from "./lib/serviceWorker";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA support
registerServiceWorker();

// Setup install prompt handling
setupInstallPrompt();
