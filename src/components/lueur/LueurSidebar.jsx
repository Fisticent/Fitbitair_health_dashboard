const NAV_ITEMS = [
  { id: "today", label: "Aujourd'hui", dot: "#15171c" },
  { id: "sleep", label: "Sommeil", dot: "#5b8def" },
  { id: "readiness", label: "Récupération", dot: "#15b393" },
  { id: "strain", label: "Charge", dot: "#ef8a6a" },
  { id: "health", label: "Santé", dot: "#8b7fd4" },
  { id: "plus", label: "Analyses", dot: "#667085" },
];

export function LueurSidebar({ active, onNavigate, profileAge }) {
  return (
    <aside className="lueur-sidebar" aria-label="Navigation">
      <div className="lueur-brand">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <circle cx="13" cy="13" r="9.2" fill="none" stroke="#15171c" strokeWidth="3.4" />
        </svg>
        <span className="lueur-brand-name">Lueur</span>
      </div>
      <div className="lueur-nav-label">MENU</div>
      <nav className="lueur-nav" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`lueur-nav-item${active === item.id ? " is-active" : ""}`}
            onClick={() => onNavigate(item.id)}
            aria-current={active === item.id ? "page" : undefined}
          >
            <span className="lueur-nav-dot" style={{ background: item.dot }} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <button
        type="button"
        className={`lueur-profile${active === "profile" ? " is-active" : ""}`}
        onClick={() => onNavigate("profile")}
        aria-label={
          profileAge != null ? `Profil · ${profileAge} ans` : "Profil · Google Health"
        }
      >
        <div className="lueur-profile-avatar" aria-hidden="true">
          XH
        </div>
        <div>
          <div className="lueur-profile-name">X·Health</div>
          <div className="lueur-profile-sub">
            {profileAge != null ? `${profileAge} ans · Profil` : "Profil · Google Health"}
          </div>
        </div>
      </button>
    </aside>
  );
}
