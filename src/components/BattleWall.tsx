import type { BattleResult } from '../types/battle';
import { COPY, formatPnl, formatPct, formatStatus } from '../data/copySlots';

export function BattleWall({ wall }: { wall: BattleResult[] }) {
  if (wall.length === 0) {
    return (
      <section className="battle-wall" aria-label="戰績牆">
        <h3>戰績牆</h3>
        <p className="copy-block">{COPY.emptyWall}</p>
      </section>
    );
  }

  return (
    <section className="battle-wall" aria-label="戰績牆">
      <h3>戰績牆 · 最近 {wall.length} 筆</h3>
      <ul className="battle-wall__list">
        {wall.map((r) => (
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
