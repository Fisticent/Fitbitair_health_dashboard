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
    clickable && "lueur-card--clickable",
    span2 && "lueur-span-2",
    span3 && "lueur-span-3",
    span4 && "lueur-span-4",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const Tag = onClick ? "button" : "div";
  const extra = onClick
    ? { type: "button", onClick, style: { ...style, textAlign: "left", font: "inherit", color: "inherit" } }
    : { style };

  return (
    <Tag className={cls} {...extra}>
      {children}
    </Tag>
  );
}
