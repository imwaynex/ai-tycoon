import type { ExpeditionState } from '../../types/battle';
import { OPENING_LINE } from '../../data/wolf';
import {
  COPY,
  REJECT_REASON_ZH,
} from '../../data/copySlots';
import { canDispatch, getRejectReason } from '../../store/expeditionStore';
import { SimulationBadge } from '../SimulationBadge';
import { WolfCard } from '../WolfCard';
import { BattleWall } from '../BattleWall';

interface Props {
  state: ExpeditionState;
  onAcceptWolf: () => void;
  onDispatch: () => void;
  onToggleForceFail: () => void;
}

export function HomeScreen({
  state,
  onAcceptWolf,
  onDispatch,
  onToggleForceFail,
}: Props) {
  const reject = getRejectReason(state);
  const ready = canDispatch(state);

  return (
    <div className="screen screen--home">
      <SimulationBadge />

      <header className="empire-header">
        <p className="opening-line">{OPENING_LINE}</p>
        <p className="empire-meta">
          帝國 · 模擬籌碼{' '}
          <strong>{Math.round(state.empire.available_stake).toLocaleString()}</strong>{' '}
          sandbox_USD
        </p>
      </header>

      {!state.hasAgent || !state.agent ? (
        <section className="empty-agent">
          <p className="copy-block">{COPY.emptyHome}</p>
          <button type="button" className="btn btn--primary" onClick={onAcceptWolf}>
            收下 WOLF
          </button>
        </section>
      ) : (
        <>
          <WolfCard agent={state.agent} />

          {state.agent.status === 'in_progress' ? (
            <p className="hint">WOLF 作戰中——請等候戰報。</p>
          ) : ready ? (
            <button
              type="button"
              className="btn btn--primary btn--dispatch"
              onClick={onDispatch}
            >
              出征
            </button>
          ) : (
            <div className="cannot-dispatch">
              <p className="copy-block">
                {COPY.cannotDispatch(
                  REJECT_REASON_ZH[reject ?? ''] ?? reject ?? '未知',
                )}
              </p>
              <button type="button" className="btn btn--disabled" disabled>
                出征
              </button>
            </div>
          )}
        </>
      )}

      <BattleWall wall={state.battleWall} />

      {/* 隱藏／dev：連點標題旁小字可切失敗模式；或直接用下方摺疊 */}
      <details className="dev-panel">
        <summary>開發者選項</summary>
        <label className="dev-toggle">
          <input
            type="checkbox"
            checked={state.forceFailMode}
            onChange={onToggleForceFail}
          />
          強制失敗態（failed_*）— 關閉時約 10% 自然失敗
        </label>
        <p className="dev-note">
          planned_duration_sec 模板值 = 300；演示等待 2–4 秒。無取消鈕。
        </p>
      </details>
    </div>
  );
}
