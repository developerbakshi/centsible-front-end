import React, { useRef, useState } from "react";

const DELETE_ACTION_WIDTH = 88;
const OPEN_THRESHOLD = 44;

function clampOffset(offset) {
  return Math.max(-DELETE_ACTION_WIDTH, Math.min(0, offset));
}

function SwipeableExpenseRow({
  expense,
  monthKey,
  isOpen,
  onOpenChange,
  onEdit,
  onRequestDelete,
  children,
}) {
  const touchRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(null);

  function handleTouchStart(event) {
    if (event.touches.length !== 1) {
      touchRef.current = null;
      return;
    }

    touchRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      offset: isOpen ? -DELETE_ACTION_WIDTH : 0,
      currentOffset: isOpen ? -DELETE_ACTION_WIDTH : 0,
      dragging: false,
    };
  }

  function handleTouchMove(event) {
    const touch = touchRef.current;
    if (!touch || event.touches.length !== 1) return;

    const deltaX = event.touches[0].clientX - touch.x;
    const deltaY = event.touches[0].clientY - touch.y;
    if (
      !touch.dragging &&
      Math.abs(deltaX) > Math.abs(deltaY) &&
      Math.abs(deltaX) > 8
    ) {
      touch.dragging = true;
    }
    if (touch.dragging) {
      touch.currentOffset = clampOffset(touch.offset + deltaX);
      setDragOffset(touch.currentOffset);
    }
  }

  function handleTouchEnd() {
    const touch = touchRef.current;
    touchRef.current = null;
    if (!touch?.dragging) return;

    const shouldOpen = touch.currentOffset < -OPEN_THRESHOLD;
    setDragOffset(null);
    onOpenChange(shouldOpen ? expense.id : null);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 500);
  }

  function handleEdit() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isOpen) {
      onOpenChange(null);
      return;
    }
    onEdit(expense.id, monthKey);
  }

  function handleDelete() {
    onOpenChange(null);
    onRequestDelete(expense, monthKey);
  }

  return (
    <div className="swipe-expense">
      <button
        className="swipe-expense-delete"
        type="button"
        aria-label={`Delete ${expense.merchant || expense.note || "expense"}`}
        aria-hidden={!isOpen}
        tabIndex={isOpen ? 0 : -1}
        onClick={handleDelete}
      >
        Delete
      </button>
      <button
        className="swipe-expense-main"
        type="button"
        style={{
          transform: `translateX(${dragOffset ?? (isOpen ? -DELETE_ACTION_WIDTH : 0)}px)`,
          transition: dragOffset === null ? undefined : "none",
        }}
        aria-expanded={isOpen}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            onOpenChange(expense.id);
          } else if (event.key === "Escape" && isOpen) {
            onOpenChange(null);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleEdit}
      >
        {children}
      </button>
    </div>
  );
}

export default SwipeableExpenseRow;
