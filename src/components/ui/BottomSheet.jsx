import React from "react";
import "./bottomSheet.css";

function BottomSheet({ open, onClose, children }) {
  return (
    <>
      <div
        className={`scrim${open ? " on" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        className={`sheet${open ? " on" : ""}`}
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-hidden={!open}
      >
        <div className="grab" />
        {open && children}
      </section>
    </>
  );
}

export default BottomSheet;
