/**
 * GrowthCompare — 同一 agent 最近兩筆正式牆 BattleResult 對照。
 * 數字由引擎欄位相減；敘事不發明公式。禁止合成單一成長分。
 */

import type { BattleResult, GrowthCompare, GrowthVerdict } from '../types/battle';
import { EMPIRE_ID, WOLF_PERSONA } from '../data/wolf';

export function isPreseededMock(r: BattleResult): boolean {
  return (
    r.sandbox_run_id.startsWith('hist_seed_') ||
    r.mission_id.startsWith('msn_hist_')
  );
}

/** 本帝國、該 agent、可進正式牆的紀錄；settled_at 新→舊 */
export function formalWallForAgent(
  wall: BattleResult[],
  agentId: string = WOLF_PERSONA.agent_id,
  empireId: string = EMPIRE_ID,
): BattleResult[] {
  return wall
    .filter(
      (r) =>
        r.agent_id === agentId &&
        r.empire_id === empireId &&
        !isPreseededMock(r),
    )
    .slice()
    .sort((a, b) => Date.parse(b.settled_at) - Date.parse(a.settled_at));
}

export function verdictFromDeltaReturnPct(delta: number): GrowthVerdict {
  if (delta > 0) return 'better';
  if (delta < 0) return 'worse';
  return 'flat';
}

function emptyCompare(
  agentId: string,
  empireId: string,
  createdAt: string,
): GrowthCompare {
  return {
    compare_id: '',
    agent_id: agentId,
    empire_id: empireId,
    prev_result_id: null,
    curr_result_id: null,
    prev_realized_pnl: null,
    prev_return_pct: null,
    prev_max_drawdown: null,
    prev_trade_count: null,
    curr_realized_pnl: null,
    curr_return_pct: null,
    curr_max_drawdown: null,
    curr_trade_count: null,
    delta_realized_pnl: null,
    delta_return_pct: null,
    delta_max_drawdown: null,
    delta_trade_count: null,
    verdict: 'none',
    created_at: createdAt,
  };
}

export function buildGrowthCompare(
  wall: BattleResult[],
  agentId: string = WOLF_PERSONA.agent_id,
  empireId: string = EMPIRE_ID,
  now: Date = new Date(),
): GrowthCompare {
  const ranked = formalWallForAgent(wall, agentId, empireId);
  if (ranked.length < 2) {
    return emptyCompare(agentId, empireId, now.toISOString());
  }

  const curr = ranked[0];
  const prev = ranked[1];
  const delta_realized_pnl = curr.realized_pnl - prev.realized_pnl;
  const delta_return_pct = curr.return_pct - prev.return_pct;
  const delta_max_drawdown = curr.max_drawdown - prev.max_drawdown;
  const delta_trade_count = curr.trade_count - prev.trade_count;

  return {
    compare_id: `cmp_${prev.result_id}_${curr.result_id}`,
    agent_id: agentId,
    empire_id: empireId,
    prev_result_id: prev.result_id,
    curr_result_id: curr.result_id,
    prev_realized_pnl: prev.realized_pnl,
    prev_return_pct: prev.return_pct,
    prev_max_drawdown: prev.max_drawdown,
    prev_trade_count: prev.trade_count,
    curr_realized_pnl: curr.realized_pnl,
    curr_return_pct: curr.return_pct,
    curr_max_drawdown: curr.max_drawdown,
    curr_trade_count: curr.trade_count,
    delta_realized_pnl,
    delta_return_pct,
    delta_max_drawdown,
    delta_trade_count,
    verdict: verdictFromDeltaReturnPct(delta_return_pct),
    created_at: curr.settled_at,
  };
}

/** 回撤輔助說明：絕對回撤變小。不可單獨翻轉 better/worse。 */
export function drawdownConverged(compare: GrowthCompare): boolean {
  if (compare.prev_max_drawdown == null || compare.curr_max_drawdown == null) {
    return false;
  }
  return Math.abs(compare.curr_max_drawdown) < Math.abs(compare.prev_max_drawdown);
}
