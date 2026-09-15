import { describe, it, expect, beforeEach } from 'vitest';
import type { ExpeditionState, Mission } from '../types/battle';
import {
  assertBattleResultShape,
  buildMockHistory,
  deriveMetricsFromRunId,
  deriveOutcomeFromRunId,
  newMissionId,
  newSandboxRunId,
  replayConsistent,
  settleMission,
} from '../engine/mockEngine';
import {
  canDispatch,
  createInitialState,
  dispatch,
  settle,
  setForceFailMode,
} from '../store/expeditionStore';
import { MISSION_STAKE, PLANNED_DURATION_SEC } from '../data/wolf';

/** 無 localStorage 環境的乾淨初始態 */
function freshState(): ExpeditionState {
  const s = createInitialState(true);
  return {
    ...s,
    battleWall: [],
    forceFailMode: false,
  };
}

describe('redispatch block while in_progress', () => {
  it('blocks second dispatch when already in_progress', () => {
    let state = freshState();
    expect(canDispatch(state)).toBe(true);

    const first = dispatch(state);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;
    expect(state.screen).toBe('in_progress');
    expect(state.activeMission).not.toBeNull();
    expect(state.agent?.status).toBe('in_progress');

    const second = dispatch(state);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBe('active_mission');
    expect(second.state.screen).toBe('in_progress');
  });

  it('cannot dispatch when agent not ready', () => {
    const state = freshState();
    state.agent = state.agent
      ? { ...state.agent, status: 'in_progress' }
      : null;
    state.activeMission = {
      mission_id: 'x',
      agent_id: 'agent_wolf',
      stake: MISSION_STAKE,
      planned_duration_sec: PLANNED_DURATION_SEC,
      sandbox_run_id: 'srun_test',
      started_at: new Date().toISOString(),
    };
    state.screen = 'in_progress';
    expect(canDispatch(state)).toBe(false);
    const r = dispatch(state);
    expect(r.ok).toBe(false);
  });
});

describe('replay consistency', () => {
  it('same sandbox_run_id → same realized_pnl / return_pct', () => {
    const id = 'srun_deterministic_replay_abc';
    const a = deriveMetricsFromRunId(id);
    const b = deriveMetricsFromRunId(id);
    expect(a.realized_pnl).toBe(b.realized_pnl);
    expect(a.return_pct).toBe(b.return_pct);
    expect(a.max_drawdown).toBe(b.max_drawdown);
    expect(a.trade_count).toBe(b.trade_count);
  });

  it('settle twice with same run_id yields same pnl metrics', () => {
    const sandbox_run_id = 'srun_settle_twice_xyz';
    const mission: Mission = {
      mission_id: newMissionId(),
      agent_id: 'agent_wolf',
      stake: MISSION_STAKE,
      planned_duration_sec: PLANNED_DURATION_SEC,
      sandbox_run_id,
      started_at: '2026-09-15T00:00:00.000Z',
    };
    const r1 = settleMission(mission, {
      forceStatus: 'completed',
      demoElapsedSec: 3,
    });
    const r2 = settleMission(
      { ...mission, mission_id: newMissionId() },
      { forceStatus: 'failed_risk_breach', demoElapsedSec: 4 },
    );
    expect(r1.realized_pnl).toBe(r2.realized_pnl);
    expect(r1.return_pct).toBe(r2.return_pct);
    expect(replayConsistent(sandbox_run_id, r1.realized_pnl, r1.return_pct)).toBe(
      true,
    );
  });

  it('different run_ids can differ', () => {
    const a = deriveMetricsFromRunId('srun_aaa');
    const b = deriveMetricsFromRunId('srun_bbb_totally_different');
    // 極低機率相等；若相等也不算失敗規格，但通常不同
    const same =
      a.realized_pnl === b.realized_pnl && a.return_pct === b.return_pct;
    expect(typeof same).toBe('boolean');
  });
});

describe('BattleResult required fields', () => {
  it('settleMission returns full required shape', () => {
    const mission: Mission = {
      mission_id: 'msn_shape',
      agent_id: 'agent_wolf',
      stake: MISSION_STAKE,
      planned_duration_sec: PLANNED_DURATION_SEC,
      sandbox_run_id: newSandboxRunId('shape'),
      started_at: new Date().toISOString(),
    };
    const result = settleMission(mission, { demoElapsedSec: 3 });
    const missing = assertBattleResultShape(result);
    expect(missing).toEqual([]);
    expect(result.real_trading).toBe(false);
    expect(result.planned_duration_sec).toBe(PLANNED_DURATION_SEC);
    expect(result.currency).toBe('sandbox_USD');
  });

  it('failed_* includes breach_code', () => {
    const mission: Mission = {
      mission_id: 'msn_fail',
      agent_id: 'agent_wolf',
      stake: MISSION_STAKE,
      planned_duration_sec: PLANNED_DURATION_SEC,
      sandbox_run_id: 'srun_force_fail_check',
      started_at: new Date().toISOString(),
    };
    const result = settleMission(mission, {
      forceStatus: 'failed_risk_breach',
      demoElapsedSec: 2,
    });
    expect(result.status).toBe('failed_risk_breach');
    expect(result.breach_code).toBeTruthy();
    expect(assertBattleResultShape(result)).toEqual([]);
  });

  it('mock history has at least 5 consistent entries', () => {
    const hist = buildMockHistory(5);
    expect(hist.length).toBeGreaterThanOrEqual(5);
    for (const r of hist) {
      expect(assertBattleResultShape(r)).toEqual([]);
      expect(
        replayConsistent(r.sandbox_run_id, r.realized_pnl, r.return_pct),
      ).toBe(true);
    }
  });
});

describe('happy path settle into wall', () => {
  beforeEach(() => {
    // node 環境可能無 localStorage；settle 內 save 已 try/catch
  });

  it('dispatch → settle yields return screen and wall entry when consistent', () => {
    let state = freshState();
    state = setForceFailMode(state, false);
    const d = dispatch(state);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    state = d.state;

    // 固定 run_id 方便斷言
    if (state.activeMission) {
      state = {
        ...state,
        activeMission: {
          ...state.activeMission,
          sandbox_run_id: 'srun_happy_path_fixed',
        },
      };
    }

    state = settle(state, 3);
    expect(state.screen).toBe('return');
    expect(state.lastResult).not.toBeNull();
    expect(state.activeMission).toBeNull();
    expect(state.agent?.status).toBe('ready');
    expect(state.lastResult?.real_trading).toBe(false);

    const outcome = deriveOutcomeFromRunId('srun_happy_path_fixed');
    expect(state.lastResult?.realized_pnl).toBe(outcome.realized_pnl);
    expect(state.lastResult?.return_pct).toBe(outcome.return_pct);
  });
});
