import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import "../../styles/date-picker.css";

const RANGE_DAYS = 90;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function parseIso(iso) {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function positionPop(triggerEl) {
  const rect = triggerEl.getBoundingClientRect();
  return {
    top: rect.bottom + 8,
    right: Math.max(12, window.innerWidth - rect.right),
  };
}

function getFocusableNodes(container) {
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
  );
}

export function DashboardDatePicker({
  value,
  onChange,
  today,
  datesWithData = [],
  variant = "desktop",
}) {
  const isLueur = variant === "lueur";
  const popId = useId();
  const titleId = `${popId}-title`;
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 12 });
  const triggerRef = useRef(null);
  const popRef = useRef(null);
  const wasOpenRef = useRef(false);

  const selected = parseIso(value);
  const maxDate = today ? startOfDay(parseIso(today)) : undefined;
  const minDate = maxDate ? startOfDay(subDays(maxDate, RANGE_DAYS)) : undefined;

  const dataSet = useMemo(() => new Set(datesWithData || []), [datesWithData]);

  const refreshPosition = useCallback(() => {
    if (triggerRef.current) {
      setCoords(positionPop(triggerRef.current));
    }
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    refreshPosition();
    const onReposition = () => refreshPosition();
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
    };
  }, [open, refreshPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inPop = popRef.current?.contains(e.target);
      if (!inTrigger && !inPop) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open || !popRef.current) return undefined;
    const pop = popRef.current;
    const raf = requestAnimationFrame(() => {
      const nodes = getFocusableNodes(pop);
      nodes[0]?.focus();
    });
    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const nodes = getFocusableNodes(pop);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    pop.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      pop.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = open;
  }, [open]);

  const popover =
    open &&
    createPortal(
      <div
        ref={popRef}
        id={popId}
        className="date-picker-pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ top: coords.top, right: coords.right }}
      >
        <span id={titleId} className="date-picker-sr-only">
          Choisir une date
        </span>
        <Calendar
          mode="single"
          locale={fr}
          selected={selected}
          defaultMonth={selected ?? maxDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(toIso(date));
            close();
          }}
          disabled={(date) => {
            const day = startOfDay(date);
            if (maxDate && day > maxDate) return true;
            if (minDate && day < minDate) return true;
            return false;
          }}
          modifiers={{
            hasData: (date) => dataSet.has(toIso(date)),
            noData: (date) => !dataSet.has(toIso(date)),
          }}
          modifiersClassNames={{
            hasData: "rdp-day_has-data",
            noData: "rdp-day_no-data",
          }}
        />
        <p className="date-picker-legend">
          <span className="date-picker-legend-dot date-picker-legend-dot--data" />
          Données sync
          <span className="date-picker-legend-dot date-picker-legend-dot--empty" />
          Jour sans données
        </p>
      </div>,
      document.body,
    );

  return (
    <div className={`date-picker-wrap${isLueur ? " date-picker-wrap--lueur" : ""}`}>
      {!isLueur && <span className="date-picker-label">Date</span>}
      <button
        ref={triggerRef}
        type="button"
        className={isLueur ? "lueur-toolbar-date" : "dashboard-date-trigger"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarIcon data-icon="inline-start" size={16} />
        {selected ? format(selected, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
      </button>
      {popover}
    </div>
  );
}
