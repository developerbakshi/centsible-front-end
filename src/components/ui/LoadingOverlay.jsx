import React from "react";

function LoadingOverlay() {
  return (
    <div
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img src="/centsible-loader-ripple.svg" alt="" />
    </div>
  );
}

export default LoadingOverlay;
