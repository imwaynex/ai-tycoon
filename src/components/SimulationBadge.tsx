/** 模擬盤標紅 — 常駐可見；real_trading=false */
export function SimulationBadge() {
  return (
    <div className="sim-badge" role="status" aria-label="模擬盤">
      <span className="sim-badge__dot" />
      模擬盤 · real_trading=false · 示意源
    </div>
  );
}
