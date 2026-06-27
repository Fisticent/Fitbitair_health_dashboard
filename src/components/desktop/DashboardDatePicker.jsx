import { useEffect, useMemo, useRef, useState } from "react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

const RANGE_DAYS = 90;

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

export function DashboardDatePicker({
  value,
  onChange,
  today,
  datesWithData = [],
  variant = "desktop",
}) {
  const isLueur = variant === "lueur";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = parseIso(value);
  const maxDate = today ? startOfDay(parseIso(today)) : undefined;
  const minDate = maxDate ? startOfDay(subDays(maxDate, RANGE_DAYS)) : undefined;

  const dataSet = useMemo(() => new Set(datesWithData || []), [datesWithData]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={`date-picker-wrap${isLueur ? " date-picker-wrap--lueur" : ""}`}
    >
      {!isLueur && <span className="date-picker-label">Date</span>}
      <button
        type="button"
        className={isLueur ? "lueur-toolbar-date" : "dashboard-date-trigger"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <CalendarIcon data-icon="inline-start" size={16} />
        {selected ? format(selected, "d MMMM yyyy", { locale: fr }) : "Choisir une date"}
      </button>

      {open && (
        <div className="date-picker-pop" role="dialog">
          <Calendar
            mode="single"
            locale={fr}
            selected={selected}
            defaultMonth={selected ?? maxDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(toIso(date));
              setOpen(false);
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
        </div>
      )}
    </div>
  );
}
