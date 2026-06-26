export function AmbientBackground({ recoveryColor }) {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="orb orb-a" style={{ "--accent": recoveryColor }} />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grain" />
      <div className="grid-lines" />
    </div>
  );
}
