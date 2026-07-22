export function LueurCard({
  children,
  className = "",
  hero = false,
  clickable = false,
  onClick,
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

  // Prefer a div (not <button>) so metric tips can nest without invalid HTML.
  if (onClick) {
    const onKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick(e);
      }
    };
    return (
      <div
        className={cls}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        style={style}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}
