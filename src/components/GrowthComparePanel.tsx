import type { GrowthCompare } from '../types/battle';
import {
  GROWTH_COPY,
  formatDrawdown,
  formatPnl,
  formatPct,
} from '../data/copySlots';
import { drawdownConverged } from '../engine/growthCompare';

interface Props {
  compare: GrowthCompare;
  onRedispatch?: () => void;
}

function deltaClass(n: number): string {
  if (n > 0) return 'pnl-pos';
  if (n < 0) return 'pnl-neg';
  return '';
}

export function GrowthComparePanel({ compare, onRedispatch }: Props) {
  if (
    compare.verdict === 'none' ||
    compare.prev_realized_pnl == null ||
    compare.prev_return_pct == null ||
    compare.prev_max_drawdown == null ||
    compare.prev_trade_count == null ||
    compare.curr_realized_pnl == null ||
    compare.curr_return_pct == null ||
    compare.curr_max_drawdown == null ||
    compare.curr_trade_count == null ||
    compare.delta_realized_pnl == null ||
    compare.delta_return_pct == null ||
    compare.delta_max_drawdown == null
  ) {
    return null;
  }

  const g1 = GROWTH_COPY.g1({
    prev_realized_pnl: formatPnl(compare.prev_realized_pnl),
    prev_return_pct: formatPct(compare.prev_return_pct),
    prev_max_drawdown: formatDrawdown(compare.prev_max_drawdown),
    realized_pnl: formatPnl(compare.curr_realized_pnl),
    return_pct: formatPct(compare.curr_return_pct),
    max_drawdown: formatDrawdown(compare.curr_max_drawdown),
    delta_realized_pnl: formatPnl(compare.delta_realized_pnl),
    delta_return_pct: formatPct(compare.delta_return_pct),
    delta_max_drawdown: formatPct(compare.delta_max_drawdown),
  });

  const tone =
    compare.verdict === 'better'
      ? GROWTH_COPY.g2
      : compare.verdict === 'worse'
        ? GROWTH_COPY.g3
        : null;

  return (
    <section className="growth-compare" aria-label="兩次對照">
      <h3>{GROWTH_COPY.compareTitle}</h3>
      <p className="copy-block">{g1}</p>

      <div className="growth-compare__pair" aria-label="上次與這次">
        <article>
          <h4>上次</h4>
          <dl>
            <div>
              <dt>realized_pnl</dt>
              <dd className={compare.prev_realized_pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                {formatPnl(compare.prev_realized_pnl)}
              </dd>
            </div>
            <div>
              <dt>return_pct</dt>
              <dd className={compare.prev_return_pct >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                {formatPct(compare.prev_return_pct)}
              </dd>
            </div>
            <div>
              <dt>max_drawdown</dt>
              <dd>{formatDrawdown(compare.prev_max_drawdown)}</dd>
            </div>
            <div>
              <dt>trade_count</dt>
              <dd>{compare.prev_trade_count}</dd>
            </div>
          </dl>
        </article>
        <article>
          <h4>這次</h4>
          <dl>
            <div>
              <dt>realized_pnl</dt>
              <dd className={compare.curr_realized_pnl >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                {formatPnl(compare.curr_realized_pnl)}
              </dd>
            </div>
            <div>
              <dt>return_pct</dt>
              <dd className={compare.curr_return_pct >= 0 ? 'pnl-pos' : 'pnl-neg'}>
                {formatPct(compare.curr_return_pct)}
              </dd>
            </div>
            <div>
              <dt>max_drawdown</dt>
              <dd>{formatDrawdown(compare.curr_max_drawdown)}</dd>
            </div>
            <div>
              <dt>trade_count</dt>
              <dd>{compare.curr_trade_count}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="growth-compare__deltas" aria-label="差在">
        <h4>差在</h4>
        <ul>
          <li>
            <span>pnl</span>
            <strong className={deltaClass(compare.delta_realized_pnl)}>
              {formatPnl(compare.delta_realized_pnl)}
            </strong>
          </li>
          <li>
            <span>報酬</span>
            <strong className={deltaClass(compare.delta_return_pct)}>
              {formatPct(compare.delta_return_pct)}
            </strong>
          </li>
          <li>
            <span>回撤</span>
            <strong>{formatPct(compare.delta_max_drawdown)}</strong>
          </li>
        </ul>
        {drawdownConverged(compare) && (
          <p className="growth-compare__note">{GROWTH_COPY.drawdownConverged}</p>
        )}
      </div>

      {tone && <p className="copy-block">{tone}</p>}

      {onRedispatch && (
        <button type="button" className="btn btn--primary" onClick={onRedispatch}>
          {GROWTH_COPY.redispatch}
        </button>
      )}
    </section>
  );
}
