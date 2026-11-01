import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AppProvider } from "./state/AppContext.jsx";
import "./styles/tokens.css";
import "./styles/global.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.error("Could not register the Centsible service worker.", error);
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
