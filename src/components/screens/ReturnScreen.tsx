import type { ExpeditionState } from '../../types/battle';
import {
  COPY,
  formatDuration,
  formatDrawdown,
  formatPct,
  formatPnl,
  formatStatus,
} from '../../data/copySlots';
import { buildGrowthCompare } from '../../engine/growthCompare';
import { SimulationBadge } from '../SimulationBadge';
import { BattleWall } from '../BattleWall';
import { GrowthComparePanel } from '../GrowthComparePanel';

interface Props {
  state: ExpeditionState;
  onRedispatch: () => void;
}

export function ReturnScreen({ state, onRedispatch }: Props) {
  const r = state.lastResult;

  if (!r) {
    return (
      <div className="screen screen--return">
        <SimulationBadge />
        <p>尚無戰報。</p>
        <button type="button" className="btn btn--primary" onClick={onRedispatch}>
          回帝國大廳
        </button>
      </div>
    );
  }

  const isOk = r.status === 'completed';
  const compare = buildGrowthCompare(state.battleWall);
  const showCompare = compare.verdict !== 'none';

  return (
    <div className="screen screen--return">
      <SimulationBadge />

      <header className="return-header">
        <h2>{isOk ? 'WOLF 歸來' : 'WOLF 折返'}</h2>
        <p className="copy-block">
          {isOk
            ? COPY.returnSuccess({
                realized_pnl: formatPnl(r.realized_pnl),
                return_pct: formatPct(r.return_pct),
                max_drawdown: formatDrawdown(r.max_drawdown),
                trade_count: r.trade_count,
                actual_duration_sec: formatDuration(r.actual_duration_sec),
              })
            : COPY.returnFail({
                status: r.status,
                breach_code: r.breach_code ?? '—',
              })}
        </p>
        <p className="audit-hint">{COPY.auditHint}</p>
      </header>

      <section className="result-grid" aria-label="可講戰果欄位">
        <div>
          <span className="label">status</span>
          <strong>{formatStatus(r.status)}</strong>
        </div>
        <div>
          <span className="label">realized_pnl</span>
          <strong className={r.realized_pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
            {formatPnl(r.realized_pnl)}
          </strong>
        </div>
        <div>
          <span className="label">return_pct</span>
          <strong className={r.return_pct >= 0 ? 'pnl-pos' : 'pnl-neg'}>
            {formatPct(r.return_pct)}
          </strong>
        </div>
        <div>
          <span className="label">max_drawdown</span>
          <strong>{formatDrawdown(r.max_drawdown)}</strong>
        </div>
        <div>
          <span className="label">trade_count</span>
          <strong>{r.trade_count}</strong>
        </div>
        <div>
          <span className="label">actual_duration_sec</span>
          <strong>{formatDuration(r.actual_duration_sec)}</strong>
        </div>
        {!isOk && (
          <div className="span-2">
            <span className="label">breach_code</span>
            <strong className="pnl-fail">{r.breach_code ?? '—'}</strong>
          </div>
        )}
      </section>

      {showCompare && (
        <GrowthComparePanel compare={compare} onRedispatch={onRedispatch} />
      )}

      {!showCompare && (
        <button type="button" className="btn btn--primary" onClick={onRedispatch}>
          再出征
        </button>
      )}

      <BattleWall wall={state.battleWall} showCompare={false} />
    </div>
  );
}
