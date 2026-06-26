import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDeltaAbs } from "../../utils/formatMetric";

export function DeltaBadge({ comparison, unit = "", className }) {
  if (!comparison) return null;

  const { deltaPct, deltaAbs, baseline, favorable, periodDays } = comparison;
  const pctSign = deltaPct >= 0 ? "+" : "";

  return (
    <div className={cn("delta-badge-wrap dark", className)}>
      <Badge
        variant="outline"
        className={cn(
          "delta-badge",
          favorable ? "delta-badge--good" : "delta-badge--warn",
        )}
      >
        {pctSign}
        {deltaPct}% vs {periodDays}j
      </Badge>
      {deltaAbs != null && (
        <span className="delta-badge-sub">
          {deltaAbs >= 0 ? "+" : ""}
          {formatDeltaAbs("", deltaAbs)}
          {unit} vs hier · moy. {baseline}
          {unit}
        </span>
      )}
      {deltaAbs == null && (
        <span className="delta-badge-sub">
          moy. {periodDays}j : {baseline}
          {unit}
        </span>
      )}
    </div>
  );
}

export function MonitorDelta({ value, baseline, unit = "", lowerIsBetter = false, name = "" }) {
  if (value == null || baseline == null) return null;
  const delta = value - baseline;
  const pct = baseline ? (delta / baseline) * 100 : 0;
  const favorable = lowerIsBetter ? delta <= 0 : delta >= 0;
  const sign = delta >= 0 ? "+" : "";
  const pctRounded = Math.round(pct);

  return (
    <span className={cn("monitor-delta", favorable ? "monitor-delta--good" : "monitor-delta--warn")}>
      {sign}
      {formatDeltaAbs(name, delta)}
      {unit} ({sign}
      {pctRounded}%)
    </span>
  );
}
