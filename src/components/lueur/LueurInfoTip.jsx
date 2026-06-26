import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getMetricTip } from "../../data/metricTooltips";

const BUBBLE_MAX_W = 280;
const VIEWPORT_MARGIN = 12;

function positionBubble(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  const midX = rect.left + rect.width / 2;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
  const placement = spaceAbove >= 72 || spaceAbove >= spaceBelow ? "top" : "bottom";

  let left = midX;
  const half = BUBBLE_MAX_W / 2;
  left = Math.max(VIEWPORT_MARGIN + half, Math.min(window.innerWidth - VIEWPORT_MARGIN - half, left));

  const top = placement === "top" ? rect.top - 10 : rect.bottom + 10;

  return { top, left, placement };
}

export function LueurInfoTip({ text }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placement: "top" });
  const triggerRef = useRef(null);
  const tipId = useId();

  const refresh = useCallback(() => {
    if (triggerRef.current) {
      setCoords(positionBubble(triggerRef.current));
    }
  }, []);

  const show = useCallback(() => {
    refresh();
    setOpen(true);
  }, [refresh]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onReposition = () => refresh();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, refresh]);

  if (!text) return null;

  const bubble =
    open &&
    createPortal(
      <span
        id={tipId}
        className={`lueur-info-tip-bubble lueur-info-tip-bubble--${coords.placement}`}
        style={{
          top: coords.top,
          left: coords.left,
          maxWidth: BUBBLE_MAX_W,
        }}
        role="tooltip"
      >
        {text}
      </span>,
      document.body,
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="lueur-info-tip"
        aria-label="Plus d'informations"
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <span className="lueur-info-tip-icon" aria-hidden="true">
          ?
        </span>
      </button>
      {bubble}
    </>
  );
}

export function LueurMetricLabel({ id, tip, children, as: Tag = "span", className = "" }) {
  const helpText = tip ?? getMetricTip(id);
  return (
    <Tag className={["lueur-metric-label", className].filter(Boolean).join(" ")}>
      {children}
      {helpText && <LueurInfoTip text={helpText} />}
    </Tag>
  );
}
