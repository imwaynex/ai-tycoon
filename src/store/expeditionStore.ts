/**
 * 出征閉環狀態機
 * 首屏可派 --出征--> 出征中 --settle--> 歸來 --再出征--> 首屏可派
 * in_progress 不可重派；無取消。
 */

import type {
  BattleResult,
  Empire,
  ExpeditionState,
  Mission,
  RejectReason,
} from '../types/battle';
import {
  BATTLE_WALL_MAX,
  DEMO_WAIT_MS_MAX,
  DEMO_WAIT_MS_MIN,
  EMPIRE_ID,
  MISSION_STAKE,
  PLANNED_DURATION_SEC,
  createWolfAgent,
} from '../data/wolf';
import { isPreseededMock } from '../engine/growthCompare';
import {
  newMissionId,
  newSandboxRunId,
  replayConsistent,
  settleMission,
} from '../engine/mockEngine';

/** v2 ignores any old `ai-tycoon-battle-wall` mock seeds; do not migrate. */
export const BATTLE_WALL_STORAGE_KEY = 'ai-tycoon-battle-wall-v2';
const FORCE_FAIL_KEY = 'ai-tycoon-force-fail';

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadBattleWall(): BattleResult[] {
  try {
    if (!hasLocalStorage()) return [];
    const raw = localStorage.getItem(BATTLE_WALL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BattleResult[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.filter((r) => r && r.result_id && !isPreseededMock(r));
  } catch {
    return [];
  }
}

export function saveBattleWall(wall: BattleResult[]): void {
  try {
    if (!hasLocalStorage()) return;
    localStorage.setItem(
      BATTLE_WALL_STORAGE_KEY,
      JSON.stringify(wall.slice(0, BATTLE_WALL_MAX)),
    );
  } catch {
    /* ignore quota */
  }
}

export function loadForceFail(): boolean {
  try {
    if (!hasLocalStorage()) return false;
    return localStorage.getItem(FORCE_FAIL_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveForceFail(v: boolean): void {
  try {
    if (!hasLocalStorage()) return;
    localStorage.setItem(FORCE_FAIL_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function createInitialEmpire(): Empire {
  return {
    empire_id: EMPIRE_ID,
    available_stake: 100_000,
    sandbox_healthy: true,
  };
}

export function createInitialState(preloadWolf = true): ExpeditionState {
  const wall = loadBattleWall();
  const forceFail = loadForceFail();
  return {
    screen: 'home',
    hasAgent: preloadWolf,
    agent: preloadWolf ? createWolfAgent('ready') : null,
    empire: createInitialEmpire(),
    activeMission: null,
    lastResult: null,
    battleWall: wall,
    rejectReason: null,
    elapsedSec: 0,
    forceFailMode: forceFail,
  };
}

/** 計算不可派原因（mock：min_credit／cooldown 不擋） */
export function getRejectReason(state: ExpeditionState): RejectReason {
  if (!state.hasAgent || !state.agent) return 'agent_not_ready';
  if (state.agent.status !== 'ready') return 'agent_not_ready';
  if (state.activeMission) return 'active_mission';
  if (MISSION_STAKE > state.empire.available_stake) return 'insufficient_stake';
  if (!state.empire.sandbox_healthy) return 'sandbox_unhealthy';
  return null;
}

export function canDispatch(state: ExpeditionState): boolean {
  return getRejectReason(state) === null && state.screen === 'home';
}

/**
 * 嘗試出征。in_progress 時必須拒絕（不可重派）。
 */
export function dispatch(
  state: ExpeditionState,
):
  | { ok: true; state: ExpeditionState; mission: Mission }
  | { ok: false; state: ExpeditionState; error: string } {
  if (state.screen === 'in_progress' || state.activeMission) {
    return {
      ok: false,
      state: {
        ...state,
        rejectReason: 'active_mission',
      },
      error: 'active_mission',
    };
  }

  const reason = getRejectReason(state);
  if (reason) {
    return {
      ok: false,
      state: { ...state, rejectReason: reason },
      error: reason,
    };
  }

  if (!state.agent) {
    return {
      ok: false,
      state: { ...state, rejectReason: 'agent_not_ready' },
      error: 'agent_not_ready',
    };
  }

  const mission: Mission = {
    mission_id: newMissionId(),
    agent_id: state.agent.agent_id,
    stake: MISSION_STAKE,
    planned_duration_sec: PLANNED_DURATION_SEC,
    sandbox_run_id: newSandboxRunId(),
    started_at: new Date().toISOString(),
  };

  const next: ExpeditionState = {
    ...state,
    screen: 'in_progress',
    activeMission: mission,
    agent: { ...state.agent, status: 'in_progress' },
    lastResult: null,
    rejectReason: null,
    elapsedSec: 0,
    empire: {
      ...state.empire,
      available_stake: state.empire.available_stake - MISSION_STAKE,
    },
  };

  return { ok: true, state: next, mission };
}

/** settle：引擎產出 BattleResult；重放一致才進正式牆 */
export function settle(
  state: ExpeditionState,
  demoElapsedSec?: number,
): ExpeditionState {
  if (!state.activeMission || !state.agent) {
    return state;
  }

  const result = settleMission(state.activeMission, {
    forceFailMode: state.forceFailMode,
    demoElapsedSec: demoElapsedSec ?? Math.max(2, state.elapsedSec || 3),
  });

  let wall = state.battleWall;
  const consistent = replayConsistent(
    result.sandbox_run_id,
    result.realized_pnl,
    result.return_pct,
  );
  if (consistent) {
    wall = [result, ...state.battleWall].slice(0, BATTLE_WALL_MAX);
    saveBattleWall(wall);
  }

  return {
    ...state,
    screen: 'return',
    activeMission: null,
    agent: { ...state.agent, status: 'ready' },
    lastResult: result,
    battleWall: wall,
    elapsedSec: result.actual_duration_sec,
    empire: {
      ...state.empire,
      available_stake:
        state.empire.available_stake +
        MISSION_STAKE +
        (result.status === 'completed' ? result.realized_pnl : 0),
    },
  };
}

export function acceptWolf(state: ExpeditionState): ExpeditionState {
  if (state.hasAgent) return state;
  return {
    ...state,
    hasAgent: true,
    agent: createWolfAgent('ready'),
    rejectReason: null,
  };
}

export function goHomeForRedispatch(state: ExpeditionState): ExpeditionState {
  if (state.screen === 'in_progress') {
    return state;
  }
  const homeBase: ExpeditionState = {
    ...state,
    screen: 'home',
    lastResult: null,
    activeMission: null,
  };
  return {
    ...homeBase,
    rejectReason: getRejectReason(homeBase),
  };
}

export function setForceFailMode(
  state: ExpeditionState,
  on: boolean,
): ExpeditionState {
  saveForceFail(on);
  return { ...state, forceFailMode: on };
}

export function tickElapsed(state: ExpeditionState, sec: number): ExpeditionState {
  if (state.screen !== 'in_progress') return state;
  return { ...state, elapsedSec: sec };
}

export function pickDemoWaitMs(): number {
  return (
    DEMO_WAIT_MS_MIN +
    Math.floor(Math.random() * (DEMO_WAIT_MS_MAX - DEMO_WAIT_MS_MIN + 1))
  );
}

export { PLANNED_DURATION_SEC, MISSION_STAKE };
