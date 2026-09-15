import type { ExpeditionState } from '../../types/battle';
import { COPY, formatDuration } from '../../data/copySlots';
import { PLANNED_DURATION_SEC } from '../../data/wolf';
import { SimulationBadge } from '../SimulationBadge';

interface Props {
  state: ExpeditionState;
}

export function InProgressScreen({ state }: Props) {
  const name = state.agent?.name ?? 'WOLF';

  return (
    <div className="screen screen--progress">
      <SimulationBadge />

      <div className="progress-hero">
        <div className="progress-pulse" aria-hidden>
          🐺
        </div>
        <h2>
          {name} · 出征中
        </h2>
        <p className="copy-block">
          {COPY.inProgress(formatDuration(state.elapsedSec))}
        </p>
        <p className="progress-meta">
          任務時長（模板）{PLANNED_DURATION_SEC} 秒 · 演示加速等待中
        </p>
        <div className="progress-bar" aria-hidden>
          <div className="progress-bar__fill" />
        </div>
        <p className="hint">經營者不必盯盤。無取消——到點自動 settle。</p>
      </div>
    </div>
  );
}
