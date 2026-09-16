import type { BattleResult } from '../types/battle';
import { COPY, GROWTH_COPY, formatPnl, formatPct, formatStatus } from '../data/copySlots';
import { EMPIRE_ID, WOLF_PERSONA } from '../data/wolf';
import { buildGrowthCompare, isPreseededMock } from '../engine/growthCompare';
import { GrowthComparePanel } from './GrowthComparePanel';

export function BattleWall({
  wall,
  showCompare = true,
}: {
  wall: BattleResult[];
  showCompare?: boolean;
}) {
  const wolfWall = wall.filter(
    (r) =>
      r.agent_id === WOLF_PERSONA.agent_id &&
      r.empire_id === EMPIRE_ID &&
      !isPreseededMock(r),
  );
  const compare = buildGrowthCompare(wolfWall);

  if (wolfWall.length === 0) {
    return (
      <section className="battle-wall" aria-label="戰績牆">
        <h3>戰績牆</h3>
        <p className="copy-block">{COPY.emptyWall}</p>
      </section>
    );
  }

  return (
    <section className="battle-wall" aria-label="戰績牆">
      <h3>戰績牆 · 最近 {wolfWall.length} 筆</h3>
      {wolfWall.length === 1 && (
        <p className="copy-block">{GROWTH_COPY.g0}</p>
      )}
      {showCompare && compare.verdict !== 'none' && (
        <GrowthComparePanel compare={compare} />
      )}
      <ul className="battle-wall__list">
        {wolfWall.map((r) => (
          <li key={r.result_id} className="battle-wall__item">
            <div className="battle-wall__row">
              <time dateTime={r.settled_at}>
                {new Date(r.settled_at).toLocaleString('zh-TW')}
              </time>
              <span
                className={
                  r.status === 'completed'
                    ? r.realized_pnl >= 0
                      ? 'pnl-pos'
                      : 'pnl-neg'
                    : 'pnl-fail'
                }
              >
                {r.status === 'completed' ? formatPnl(r.realized_pnl) : '—'}
              </span>
            </div>
            <div className="battle-wall__row battle-wall__row--sub">
              <span>{formatStatus(r.status)}</span>
              <span>{formatPct(r.return_pct)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
