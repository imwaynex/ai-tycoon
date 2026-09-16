import { describe, it, expect } from 'vitest';
import type { BattleResult } from '../types/battle';
import {
  buildGrowthCompare,
  drawdownConverged,
  formalWallForAgent,
  isPreseededMock,
  verdictFromDeltaReturnPct,
} from '../engine/growthCompare';
import {
  createInitialState,
  dispatch,
  goHomeForRedispatch,
  loadBattleWall,
  settle,
} from '../store/expeditionStore';
import { EMPIRE_ID, WOLF_PERSONA } from '../data/wolf';
import { COPY, GROWTH_COPY } from '../data/copySlots';

function baseResult(over: Partial<BattleResult> & Pick<BattleResult, 'result_id'>): BattleResult {
  return {
    result_id: over.result_id,
    mission_id: over.mission_id ?? `msn_${over.result_id}`,
    agent_id: over.agent_id ?? WOLF_PERSONA.agent_id,
    empire_id: over.empire_id ?? EMPIRE_ID,
    created_at: over.created_at ?? '2026-09-15T00:00:00.000Z',
    settled_at: over.settled_at ?? '2026-09-15T00:05:00.000Z',
    sandbox_run_id: over.sandbox_run_id ?? `srun_${over.result_id}`,
    market_feed_id: 'feed_mock_crypto_v1',
    market_feed_version: '2026.09.15',
    planned_duration_sec: 300,
    actual_duration_sec: 3,
    status: over.status ?? 'completed',
    realized_pnl: over.realized_pnl ?? 100,
    return_pct: over.return_pct ?? 1,
    max_drawdown: over.max_drawdown ?? 2,
    trade_count: over.trade_count ?? 5,
    currency: 'sandbox_USD',
    decision_log_ref: 'mock://decision/x',
    constraint_snapshot: 'mock://constraint/x',
    skill_ids_used: ['skill_momentum_breakout'],
    risk_limit_snapshot: 'max_dd=8%',
    breach_code: over.breach_code ?? null,
    real_trading: false,
  };
}

describe('empty wall — no preseeded mock', () => {
  it('createInitialState / loadBattleWall with empty storage → []', () => {
    expect(loadBattleWall()).toEqual([]);
    const state = createInitialState(true);
    expect(state.battleWall).toEqual([]);
    expect(
      state.battleWall.some((r) => r.sandbox_run_id?.startsWith('hist_seed_')),
    ).toBe(false);
    expect(buildGrowthCompare(state.battleWall).verdict).toBe('none');
  });

  it('hist_seed_* records never become prev/curr', () => {
    const hist = [
      baseResult({
        result_id: 'seed_a',
        sandbox_run_id: 'hist_seed_alpha_01',
        mission_id: 'msn_hist_1',
        settled_at: '2026-09-14T10:00:00.000Z',
      }),
      baseResult({
        result_id: 'seed_b',
        sandbox_run_id: 'hist_seed_bravo_02',
        mission_id: 'msn_hist_2',
        settled_at: '2026-09-14T11:00:00.000Z',
      }),
    ];
    expect(hist.every(isPreseededMock)).toBe(true);
    expect(formalWallForAgent(hist)).toEqual([]);
    expect(buildGrowthCompare(hist).verdict).toBe('none');
  });
});

describe('GrowthCompare selection', () => {
  it('zero or one result → verdict none', () => {
    expect(buildGrowthCompare([]).verdict).toBe('none');
    expect(buildGrowthCompare([baseResult({ result_id: 'a' })]).verdict).toBe(
      'none',
    );
  });

  it('picks latest two by settled_at: prev older, curr newer', () => {
    const oldest = baseResult({
      result_id: 'old',
      settled_at: '2026-09-15T01:00:00.000Z',
      return_pct: 1,
    });
    const prev = baseResult({
      result_id: 'prev',
      settled_at: '2026-09-15T02:00:00.000Z',
      realized_pnl: 10,
      return_pct: 2,
      max_drawdown: 4,
      trade_count: 3,
    });
    const curr = baseResult({
      result_id: 'curr',
      settled_at: '2026-09-15T03:00:00.000Z',
      realized_pnl: 40,
      return_pct: 5,
      max_drawdown: 2,
      trade_count: 8,
    });
    // array order is not recency order
    const compare = buildGrowthCompare([oldest, curr, prev]);
    expect(compare.prev_result_id).toBe('prev');
    expect(compare.curr_result_id).toBe('curr');
    expect(compare.delta_realized_pnl).toBe(30);
    expect(compare.delta_return_pct).toBe(3);
    expect(compare.delta_max_drawdown).toBe(-2);
    expect(compare.delta_trade_count).toBe(5);
    expect(compare.verdict).toBe('better');
  });

  it('ignores other agent_id and empire_id', () => {
    const wolfPrev = baseResult({
      result_id: 'w1',
      settled_at: '2026-09-15T01:00:00.000Z',
      return_pct: 1,
    });
    const wolfCurr = baseResult({
      result_id: 'w2',
      settled_at: '2026-09-15T02:00:00.000Z',
      return_pct: 2,
    });
    const other = baseResult({
      result_id: 'fox',
      agent_id: 'agent_fox',
      settled_at: '2026-09-15T03:00:00.000Z',
      return_pct: 99,
    });
    const otherEmpire = baseResult({
      result_id: 'emp2',
      empire_id: 'empire_other',
      settled_at: '2026-09-15T04:00:00.000Z',
      return_pct: 50,
    });
    const compare = buildGrowthCompare([wolfPrev, wolfCurr, other, otherEmpire]);
    expect(compare.prev_result_id).toBe('w1');
    expect(compare.curr_result_id).toBe('w2');
    expect(compare.delta_return_pct).toBe(1);
  });

  it('failed_* results still enter compare using numeric fields', () => {
    const prev = baseResult({
      result_id: 'fail_prev',
      status: 'failed_risk_breach',
      breach_code: 'RISK_MAX_DRAWDOWN',
      settled_at: '2026-09-15T01:00:00.000Z',
      realized_pnl: -20,
      return_pct: -2,
      max_drawdown: 5,
    });
    const curr = baseResult({
      result_id: 'fail_curr',
      status: 'failed_timeout',
      breach_code: 'ENGINE_GRACE_TIMEOUT',
      settled_at: '2026-09-15T02:00:00.000Z',
      realized_pnl: -10,
      return_pct: -1,
      max_drawdown: 3,
    });
    const compare = buildGrowthCompare([prev, curr]);
    expect(compare.verdict).toBe('better');
    expect(compare.delta_return_pct).toBe(1);
    expect(compare.delta_realized_pnl).toBe(10);
  });
});

describe('verdict from delta_return_pct', () => {
  it('>0 better, <0 worse, =0 flat; trade_count does not flip', () => {
    expect(verdictFromDeltaReturnPct(0.01)).toBe('better');
    expect(verdictFromDeltaReturnPct(-0.01)).toBe('worse');
    expect(verdictFromDeltaReturnPct(0)).toBe('flat');

    const flat = buildGrowthCompare([
      baseResult({
        result_id: 'p',
        settled_at: '2026-09-15T01:00:00.000Z',
        return_pct: 2,
        realized_pnl: 10,
        max_drawdown: 5,
        trade_count: 1,
      }),
      baseResult({
        result_id: 'c',
        settled_at: '2026-09-15T02:00:00.000Z',
        return_pct: 2,
        realized_pnl: 99,
        max_drawdown: 1,
        trade_count: 99,
      }),
    ]);
    expect(flat.verdict).toBe('flat');
    expect(flat.delta_trade_count).toBe(98);
    expect(drawdownConverged(flat)).toBe(true);
  });

  it('drawdown convergence does not flip worse verdict', () => {
    const worse = buildGrowthCompare([
      baseResult({
        result_id: 'p',
        settled_at: '2026-09-15T01:00:00.000Z',
        return_pct: 5,
        max_drawdown: 6,
      }),
      baseResult({
        result_id: 'c',
        settled_at: '2026-09-15T02:00:00.000Z',
        return_pct: 1,
        max_drawdown: 2,
      }),
    ]);
    expect(worse.verdict).toBe('worse');
    expect(drawdownConverged(worse)).toBe(true);
  });
});

describe('two real expeditions produce a numeric compare', () => {
  it('dispatch → settle → redispatch → settle yields prev/curr deltas', () => {
    let state = createInitialState(true);
    state = { ...state, battleWall: [] };

    const first = dispatch(state);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = {
      ...first.state,
      activeMission: {
        ...first.state.activeMission!,
        sandbox_run_id: 'srun_growth_first',
      },
    };
    state = settle(state, 3);
    expect(state.battleWall).toHaveLength(1);
    expect(buildGrowthCompare(state.battleWall).verdict).toBe('none');

    state = goHomeForRedispatch(state);
    const second = dispatch(state);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    state = {
      ...second.state,
      activeMission: {
        ...second.state.activeMission!,
        sandbox_run_id: 'srun_growth_second',
      },
    };
    state = settle(state, 3);
    expect(state.battleWall).toHaveLength(2);

    const compare = buildGrowthCompare(state.battleWall);
    const prev = state.battleWall.find((r) => r.result_id === compare.prev_result_id)!;
    const curr = state.battleWall.find((r) => r.result_id === compare.curr_result_id)!;
    expect(compare.verdict).not.toBe('none');
    expect(compare.delta_realized_pnl).toBe(curr.realized_pnl - prev.realized_pnl);
    expect(compare.delta_return_pct).toBe(curr.return_pct - prev.return_pct);
    expect(compare.delta_max_drawdown).toBe(curr.max_drawdown - prev.max_drawdown);
    expect(compare.delta_trade_count).toBe(curr.trade_count - prev.trade_count);
    expect(Date.parse(curr.settled_at)).toBeGreaterThanOrEqual(Date.parse(prev.settled_at));
  });
});


describe('growth copy slots', () => {
  it('G4 matches empty wall slot ⑥', () => {
    expect(GROWTH_COPY.g4).toBe(COPY.emptyWall);
    expect(GROWTH_COPY.g4).toContain('戰績牆還是空的');
  });

  it('does not talk XP / levels / badges / credit', () => {
    const blob = [
      GROWTH_COPY.g0,
      GROWTH_COPY.g2,
      GROWTH_COPY.g3,
      GROWTH_COPY.g4,
      GROWTH_COPY.g1({
        prev_realized_pnl: '1',
        prev_return_pct: '2',
        prev_max_drawdown: '3',
        realized_pnl: '4',
        return_pct: '5',
        max_drawdown: '6',
        delta_realized_pnl: '7',
        delta_return_pct: '8',
        delta_max_drawdown: '9',
      }),
    ].join('\n');
    expect(blob).not.toMatch(/XP|經驗值系統|等級|徽章|信用分|聲譽/);
    expect(blob).toContain('不看經驗值');
  });
});
