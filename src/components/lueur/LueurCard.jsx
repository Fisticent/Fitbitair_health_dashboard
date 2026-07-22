export function LueurCard({
  children,
  className = "",
  hero = false,
  clickable = false,
  onClick,
  navLabel,
  span2 = false,
  span3 = false,
  span4 = false,
  style,
}) {
  const cls = [
    "lueur-card",
    hero && "lueur-card--hero",
    (clickable || onClick) && "lueur-card--clickable",
    span2 && "lueur-span-2",
    span3 && "lueur-span-3",
    span4 && "lueur-span-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Stretch hit-target button keeps tips / controls out of a nested role="button" tree.
  if (onClick) {
    return (
      <div className={cls} style={style}>
        {children}
        <button
          type="button"
          className="lueur-card-hit"
          onClick={onClick}
          aria-label={navLabel || "Ouvrir la section"}
        />
      </div>
    );
  }

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
