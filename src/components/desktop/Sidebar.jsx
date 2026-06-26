const NAV_GROUPS = [
  {
    title: "Scores",
    items: [
      { id: "overview", label: "Aperçu" },
      { id: "strain", label: "Charge" },
      { id: "sleep", label: "Sommeil" },
      { id: "health", label: "Santé" },
    ],
  },
  {
    title: "Analyse",
    items: [
      { id: "insights", label: "Analyses" },
      { id: "trends", label: "Tendances" },
      { id: "coverage", label: "Couverture" },
    ],
  },
];

export function Sidebar({ active, onNavigate }) {
  return (
    <aside className="sidebar" aria-label="Navigation principale">
      <div className="sidebar-brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <span className="brand-name">X·HEALTH</span>
          <span className="brand-sub">Google Health API</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <span className="nav-group-label">{group.title}</span>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${active === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
                aria-current={active === item.id ? "page" : undefined}
              >
                <span className="nav-dot" aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Scores maison inspirés de WHOOP</p>
        <p className="muted">Non médical · données locales</p>
      </div>
    </aside>
  );
}
