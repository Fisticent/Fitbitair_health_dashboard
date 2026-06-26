import { LueurCard } from "./LueurCard";
import { StatTile, StatGrid } from "./StatTile";
import { LueurMetricLabel } from "./LueurInfoTip";
import { SleepWindowChart, LoadBalanceChart } from "./AdvancedCharts";
import { LoadBalanceGauge } from "./LoadBalanceGauge";

function regularityZone(score) {
  if (score == null) return "neutral";
  if (score >= 85) return "green";
  if (score >= 70) return "blue";
  if (score >= 50) return "yellow";
  return "red";
}

function loadZone(zone) {
  return { optimal: "green", low: "blue", caution: "yellow", high: "red" }[zone] || "neutral";
}

function hrvZone(score) {
  if (score == null) return "neutral";
  if (score >= 65) return "green";
  if (score >= 35) return "blue";
  return "red";
}

function calibMeta(kpi, unitLabel) {
  const have = kpi?.nights ?? kpi?.days ?? 0;
  const need = kpi?.nights_needed ?? kpi?.days_needed ?? 0;
  return `Calibrage · ${have}/${need} ${unitLabel}`;
}

export function AdvancedSignals({ sleep_regularity, load_balance, hrv_balance }) {
  if (!sleep_regularity && !load_balance && !hrv_balance) return null;

  const regCal = sleep_regularity?.status === "calibrating";
  const loadCal = load_balance?.status === "calibrating";
  const hrvCal = hrv_balance?.status === "calibrating";

  return (
    <LueurCard style={{ marginTop: 20 }}>
      <LueurMetricLabel id="advanced_signals" as="p" className="lueur-label lueur-card-section-label">
        Signaux avancés
      </LueurMetricLabel>
      <p className="lueur-meta" style={{ marginBottom: 18 }}>
        Régularité, équilibre de charge et tendance VFC — calculés sur ton historique
      </p>

      <StatGrid columns={3}>
        {sleep_regularity && (
          <StatTile
            label="Régularité sommeil"
            tipId="sleep_regularity"
            value={regCal ? "—" : sleep_regularity.score}
            unit={regCal ? null : "/100"}
            meta={
              regCal
                ? calibMeta(sleep_regularity, "nuits")
                : `Coucher ~${sleep_regularity.avg_bedtime} · ±${sleep_regularity.bedtime_sigma_min} min`
            }
            status={regCal ? "En calibrage" : sleep_regularity.label}
            statusZone={regCal ? "neutral" : regularityZone(sleep_regularity.score)}
          />
        )}

        {load_balance && (
          <StatTile
            label="Équilibre de charge"
            tipId="load_balance"
            value={loadCal ? "—" : Math.round(load_balance.ratio * 100)}
            unit={loadCal ? null : "%"}
            meta={
              loadCal
                ? calibMeta(load_balance, "jours")
                : `${load_balance.acute} récent · ${load_balance.chronic} habituel`
            }
            footer={
              !loadCal && load_balance.ratio != null ? (
                <LoadBalanceGauge ratio={load_balance.ratio} zone={load_balance.zone} />
              ) : null
            }
            status={loadCal ? "En calibrage" : load_balance.label}
            statusZone={loadCal ? "neutral" : loadZone(load_balance.zone)}
          />
        )}

        {hrv_balance && (
          <StatTile
            label="HRV Balance"
            tipId="hrv_balance"
            value={hrvCal ? "—" : hrv_balance.score}
            unit={hrvCal ? null : "/100"}
            meta={
              hrvCal
                ? calibMeta(hrv_balance, "jours")
                : `${hrv_balance.recent_avg} ms vs base ${hrv_balance.baseline_avg} ms`
            }
            status={hrvCal ? "En calibrage" : hrv_balance.label}
            statusZone={hrvCal ? "neutral" : hrvZone(hrv_balance.score)}
          />
        )}
      </StatGrid>

      {sleep_regularity?.series?.length > 1 && (
        <div className="lueur-compare-block" style={{ marginTop: 22 }}>
          <p className="lueur-stat-chart-label">
            Fenêtre de sommeil · {sleep_regularity.series.length} nuits (coucher → lever)
          </p>
          <SleepWindowChart
            series={sleep_regularity.series}
            avgBed={sleep_regularity.avg_bed_min}
            avgWake={sleep_regularity.avg_wake_min}
          />
        </div>
      )}

      {load_balance?.series?.length > 1 && (
        <div className="lueur-compare-block" style={{ marginTop: 22 }}>
          <p className="lueur-stat-chart-label">Équilibre de charge · tendance 14 jours</p>
          <LoadBalanceChart series={load_balance.series} />
        </div>
      )}
    </LueurCard>
  );
}
