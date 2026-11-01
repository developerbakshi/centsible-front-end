import React from "react";

function LoadingOverlay({ splash = false }) {
  return (
    <div
      className={`loading-overlay${splash ? " loading-overlay-splash" : ""}`}
      role="status"
      aria-live="polite"
      aria-label={splash ? "Loading Centsible" : "Loading"}
    >
      {splash ? (
        <picture>
          <source
            srcSet="/centsible-splash-1206x2622-dark.png"
            media="(prefers-color-scheme: dark)"
          />
          <img
            src="/centsible-splash-1206x2622-light.png"
            alt=""
          />
        </picture>
      ) : (
        <img src="/centsible-loader-ripple.svg" alt="" />
      )}
    </div>
  );
}

export default LoadingOverlay;
