/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { BattleResult, ExpeditionState } from '../types/battle';
import { BattleWall } from '../components/BattleWall';
import { ReturnScreen } from '../components/screens/ReturnScreen';
import { HomeScreen } from '../components/screens/HomeScreen';
import { createInitialState, loadBattleWall } from '../store/expeditionStore';
import { EMPIRE_ID, WOLF_PERSONA } from '../data/wolf';
import { GROWTH_COPY } from '../data/copySlots';
import { buildMockHistory } from '../engine/mockEngine';

function result(
  over: Partial<BattleResult> & Pick<BattleResult, 'result_id'>,
): BattleResult {
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

function homeState(wall: BattleResult[]): ExpeditionState {
  return { ...createInitialState(true), battleWall: wall };
}

function returnState(wall: BattleResult[]): ExpeditionState {
  const last = wall[0] ?? null;
  return {
    ...createInitialState(true),
    screen: 'return',
    battleWall: wall,
    lastResult: last,
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('empty wall G4', () => {
  it('HomeScreen shows slot ⑥ / G4 when zero expeditions', () => {
    render(
      <HomeScreen
        state={homeState([])}
        onAcceptWolf={() => {}}
        onDispatch={() => {}}
        onToggleForceFail={() => {}}
      />,
    );
    expect(screen.getByText(/戰績牆還是空的/)).toBeTruthy();
    expect(screen.queryByLabelText('兩次對照')).toBeNull();
    expect(screen.getByLabelText('模擬盤')).toBeTruthy();
  });

  it('loadBattleWall strips preseeded mock history from storage', () => {
    window.localStorage.setItem(
      'ai-tycoon-battle-wall',
      JSON.stringify(buildMockHistory(5)),
    );
    expect(loadBattleWall()).toEqual([]);
  });
});

describe('G0 one result', () => {
  it('wall shows G0 and no compare', () => {
    render(
      <BattleWall
        wall={[
          result({
            result_id: 'only',
            settled_at: '2026-09-15T01:00:00.000Z',
          }),
        ]}
      />,
    );
    expect(screen.getByText(/WOLF 只有一筆戰績/)).toBeTruthy();
    expect(screen.queryByLabelText('兩次對照')).toBeNull();
  });

  it('return screen does not open compare after a single settle', () => {
    render(
      <ReturnScreen
        state={returnState([
          result({
            result_id: 'only',
            settled_at: '2026-09-15T01:00:00.000Z',
          }),
        ])}
        onRedispatch={() => {}}
      />,
    );
    expect(screen.queryByLabelText('兩次對照')).toBeNull();
    expect(screen.getByRole('button', { name: '再出征' })).toBeTruthy();
    expect(screen.getByText(/WOLF 只有一筆戰績/)).toBeTruthy();
  });
});

describe('two-run compare UI', () => {
  const wall = [
    result({
      result_id: 'curr',
      settled_at: '2026-09-15T02:00:00.000Z',
      realized_pnl: 400,
      return_pct: 4,
      max_drawdown: 1.5,
      trade_count: 9,
    }),
    result({
      result_id: 'prev',
      settled_at: '2026-09-15T01:00:00.000Z',
      realized_pnl: 100,
      return_pct: 1,
      max_drawdown: 3,
      trade_count: 4,
    }),
  ];

  it('return screen shows G1 numbers + G2 under the six fields', () => {
    render(<ReturnScreen state={returnState(wall)} onRedispatch={() => {}} />);
    const compare = screen.getByLabelText('兩次對照');
    expect(compare.textContent).toContain('成長看戰績，不看經驗值');
    expect(compare.textContent).toContain('+400.00 sandbox_USD');
    expect(compare.textContent).toContain('+100.00 sandbox_USD');
    expect(compare.textContent).toContain('+4.00%');
    expect(compare.textContent).toContain('+1.00%');
    expect(compare.textContent).toContain(GROWTH_COPY.g2.split('\n')[0]);
    expect(screen.getAllByLabelText('兩次對照')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '再出征' })).toBeTruthy();
    expect(screen.getByLabelText('模擬盤')).toBeTruthy();
  });

  it('battle wall shows the same compare when ≥2', () => {
    render(<BattleWall wall={wall} />);
    const compare = screen.getByLabelText('兩次對照');
    expect(compare.textContent).toContain('成長看戰績，不看經驗值');
    expect(compare.textContent).toContain('+400.00 sandbox_USD');
    expect(compare.textContent).toContain('+100.00 sandbox_USD');
  });
});
