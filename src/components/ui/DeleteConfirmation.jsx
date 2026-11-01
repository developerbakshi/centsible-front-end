import React from "react";
import "./deleteConfirmation.css";

function DeleteConfirmation({ target, pending, onCancel, onConfirm }) {
  if (!target) return null;

  return (
    <div
      className="delete-confirmation-backdrop"
      onClick={(event) => {
        if (!pending && event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="delete-confirmation"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirmation-title"
        aria-describedby={target.error ? "delete-confirmation-error" : undefined}
        aria-busy={pending}
      >
        <div className="delete-confirmation-actions">
          <div className="delete-confirmation-title" id="delete-confirmation-title">
            Delete this expense?
          </div>
          {target.error && (
            <div
              className="delete-confirmation-error"
              id="delete-confirmation-error"
              role="alert"
            >
              {target.error}
            </div>
          )}
          <button
            className="delete-confirmation-submit"
            type="button"
            disabled={pending}
            onClick={onConfirm}
          >
            Delete expense
          </button>
        </div>
        <button
          className="delete-confirmation-cancel"
          type="button"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
      </section>
    </div>
  );
}

export default DeleteConfirmation;
