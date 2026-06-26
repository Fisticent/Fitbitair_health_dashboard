import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { seriesBaseline } from "@/utils/comparisons";

const vitalsConfig = {
  hrv: { label: "VFC", color: "#00d68f" },
  rhr: { label: "FC repos", color: "#f472b6" },
  baseline_hrv: { label: "Moy. VFC", color: "rgba(0,214,143,0.45)" },
  baseline_rhr: { label: "Moy. FC repos", color: "rgba(244,114,182,0.45)" },
};

const scoresConfig = {
  recovery: { label: "Récupération", color: "#00d68f" },
  strain: { label: "Charge", color: "#3b82f6" },
  sleep: { label: "Sommeil", color: "#a78bfa" },
};

const weightConfig = {
  weight: { label: "Poids (kg)", color: "#fbbf24" },
};

function formatChartDay(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function VitalsCompareChart({ history }) {
  if (!history?.length) return null;

  const hrvBase = seriesBaseline(history, "hrv");
  const rhrBase = seriesBaseline(history, "rhr");
  const data = history.map((d) => ({
    label: d.date.slice(8),
    date: d.date,
    hrv: d.hrv ?? null,
    rhr: d.rhr ?? null,
  }));

  return (
    <div className="compare-chart-block dark">
      <h4 className="compare-chart-title">Vitaux · 14 jours vs moyenne</h4>
      <ChartContainer config={vitalsConfig} className="compare-chart-container h-[220px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis yAxisId="hrv" orientation="left" tickLine={false} axisLine={false} width={36} />
          <YAxis yAxisId="rhr" orientation="right" tickLine={false} axisLine={false} width={36} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {hrvBase != null && (
            <ReferenceLine
              yAxisId="hrv"
              y={hrvBase}
              stroke="rgba(0,214,143,0.5)"
              strokeDasharray="4 4"
              label={{ value: `VFC moy. ${hrvBase}`, fill: "#71717a", fontSize: 10 }}
            />
          )}
          {rhrBase != null && (
            <ReferenceLine
              yAxisId="rhr"
              y={rhrBase}
              stroke="rgba(244,114,182,0.5)"
              strokeDasharray="4 4"
              label={{ value: `FC repos moy. ${rhrBase}`, fill: "#71717a", fontSize: 10 }}
            />
          )}
          <Line
            yAxisId="hrv"
            type="monotone"
            dataKey="hrv"
            stroke="var(--color-hrv)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="rhr"
            type="monotone"
            dataKey="rhr"
            stroke="var(--color-rhr)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function WeightTrendChart({
  series = [],
  focusDate,
  activeWeightDate,
  height = 200,
  compact = false,
}) {
  if (!series?.length) return null;

  const data = series.map((d) => ({
    label: formatChartDay(d.date),
    date: d.date,
    weight: d.value,
    isMeasure: true,
  }));

  const weightBase = seriesBaseline(
    series.map((d) => ({ weight: d.value })),
    "weight",
  );

  const title = compact ? null : "Évolution du poids";
  const subtitle = compact
    ? null
    : `${series.length} pesée${series.length > 1 ? "s" : ""} · jour sélectionné : ${
        activeWeightDate ? formatChartDay(activeWeightDate) : "—"
      }`;

  return (
    <div className={`compare-chart-block dark ${compact ? "weight-chart--compact" : ""}`}>
      {title && <h4 className="compare-chart-title">{title}</h4>}
      {subtitle && <p className="panel-sub weight-chart-sub">{subtitle}</p>}
      <ChartContainer
        config={weightConfig}
        className="compare-chart-container w-full"
        style={{ height }}
      >
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            hide={compact}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={compact ? "preserveStartEnd" : 0}
            angle={series.length > 6 ? -25 : 0}
            textAnchor={series.length > 6 ? "end" : "middle"}
            height={series.length > 6 ? 48 : 30}
          />
          <YAxis
            hide={compact}
            tickLine={false}
            axisLine={false}
            width={compact ? 0 : 40}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.date
                    ? formatChartDay(payload[0].payload.date)
                    : ""
                }
                formatter={(value) => [`${value} kg`, "Poids"]}
              />
            }
          />
          {weightBase != null && !compact && (
            <ReferenceLine
              y={weightBase}
              stroke="rgba(251, 191, 36, 0.45)"
              strokeDasharray="4 4"
              label={{ value: `Moy. ${weightBase} kg`, fill: "#71717a", fontSize: 10 }}
            />
          )}
          {activeWeightDate && (
            <ReferenceLine
              x={formatChartDay(activeWeightDate)}
              stroke="rgba(34, 211, 238, 0.55)"
              strokeDasharray="3 3"
              label={
                compact
                  ? undefined
                  : { value: "Pesée active", fill: "#22d3ee", fontSize: 10 }
              }
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--color-weight)"
            strokeWidth={2}
            dot={{ r: compact ? 3 : 4, fill: "var(--color-weight)" }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function WeightCompareChart({ history }) {
  const rows = (history || []).filter((d) => d.weight != null);
  if (!rows.length) return null;

  const data = rows.map((d) => ({
    label: d.date.slice(8),
    date: d.date,
    weight: d.weight,
    measured: d.weight_date === d.date,
  }));

  const base = seriesBaseline(rows, "weight");

  return (
    <div className="compare-chart-block dark">
      <h4 className="compare-chart-title">Poids · 14 jours (dernière pesée connue)</h4>
      <ChartContainer config={weightConfig} className="compare-chart-container h-[200px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={40} domain={["auto", "auto"]} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => [
                  `${value} kg`,
                  item?.payload?.measured ? "Pesée du jour" : "Dernière pesée",
                ]}
              />
            }
          />
          {base != null && (
            <ReferenceLine
              y={base}
              stroke="rgba(251, 191, 36, 0.45)"
              strokeDasharray="4 4"
            />
          )}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="var(--color-weight)"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (cx == null || cy == null) return null;
              return (
                <circle
                  key={payload.date}
                  cx={cx}
                  cy={cy}
                  r={payload.measured ? 4 : 2}
                  fill={payload.measured ? "var(--color-weight)" : "rgba(251,191,36,0.5)"}
                />
              );
            }}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function ScoresCompareChart({ history }) {
  if (!history?.length) return null;

  const recBase = seriesBaseline(history, "recovery");
  const data = history.map((d) => ({
    label: d.date.slice(8),
    recovery: d.recovery ?? null,
    strain: d.strain ?? null,
    sleep: d.sleep ?? null,
  }));

  return (
    <div className="compare-chart-block dark">
      <h4 className="compare-chart-title">Scores · vs moyenne période</h4>
      <ChartContainer config={scoresConfig} className="compare-chart-container h-[240px] w-full">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={32} domain={[0, 100]} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          {recBase != null && (
            <ReferenceLine
              y={recBase}
              stroke="rgba(0,214,143,0.45)"
              strokeDasharray="5 5"
              label={{ value: `Récup. moy. ${recBase} %`, fill: "#71717a", fontSize: 10 }}
            />
          )}
          <Area
            type="monotone"
            dataKey="recovery"
            stroke="var(--color-recovery)"
            fill="var(--color-recovery)"
            fillOpacity={0.15}
            strokeWidth={2}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="sleep"
            stroke="var(--color-sleep)"
            fill="var(--color-sleep)"
            fillOpacity={0.1}
            strokeWidth={1.5}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="strain"
            stroke="var(--color-strain)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

export function ComparePanel({ history, weightSeries, focusDate, weightDate }) {
  const hasWeightHistory = history?.some((d) => d.weight != null);
  const hasWeightSeries = weightSeries?.length > 0;

  return (
    <section className="compare-panel glass-panel span-full">
      <h3>Comparatif</h3>
      <p className="panel-sub">Courbes 14 jours avec ligne de moyenne · deltas sur chaque carte</p>
      <div className="compare-charts-grid">
        <VitalsCompareChart history={history} />
        <ScoresCompareChart history={history} />
      </div>
      {(hasWeightSeries || hasWeightHistory) && (
        <div className="compare-charts-grid compare-charts-grid--weight">
          {hasWeightSeries && (
            <WeightTrendChart
              series={weightSeries}
              focusDate={focusDate}
              activeWeightDate={weightDate}
              height={220}
            />
          )}
          {hasWeightHistory && <WeightCompareChart history={history} />}
        </div>
      )}
    </section>
  );
}
