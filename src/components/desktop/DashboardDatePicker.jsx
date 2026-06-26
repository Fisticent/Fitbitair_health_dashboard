import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

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
  const selected = parseIso(value);
  const maxDate = today ? startOfDay(parseIso(today)) : undefined;
  const minDate = maxDate ? startOfDay(subDays(maxDate, RANGE_DAYS)) : undefined;

  const dataSet = useMemo(
    () => new Set(datesWithData || []),
    [datesWithData],
  );

  return (
    <div className={`date-picker-wrap${isLueur ? " date-picker-wrap--lueur" : ""}`}>
      {!isLueur && <span className="date-picker-label">Date</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            isLueur ? (
              <button type="button" className="lueur-toolbar-date" />
            ) : (
              <Button variant="outline" size="sm" className="dashboard-date-trigger" />
            )
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {selected
            ? format(selected, "d MMMM yyyy", { locale: fr })
            : "Choisir une date"}
        </PopoverTrigger>
        <PopoverContent
          className={isLueur ? "w-auto p-0" : "dark w-auto p-0"}
          align="end"
          sideOffset={8}
        >
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
        </PopoverContent>
      </Popover>
    </div>
  );
}
