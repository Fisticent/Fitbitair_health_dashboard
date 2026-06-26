const TABS = [
  { id: "home", label: "Today", icon: "◉" },
  { id: "strain", label: "Charge", icon: "◎" },
  { id: "sleep", label: "Sommeil", icon: "◐" },
  { id: "health", label: "Health", icon: "♡" },
];

export function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`nav-item ${active === tab.id ? "active" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
