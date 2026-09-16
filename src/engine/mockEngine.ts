/**
 * Mock 出征引擎
 * - 完整 BattleResult；UI 只渲染可講欄位
 * - 同 sandbox_run_id 重放 → 同 realized_pnl / return_pct（數字只由 run_id 決定，與 status 無關）
 * - happy path 偏向 completed + 正 pnl（~90%）
 * - failed_*：localStorage 開關 forceFailMode，或 seeded ~10%
 * - planned_duration_sec 固定模板值 300；演示等待另縮 2–4s
 */

import type {
  BattleResult,
  BattleStatus,
  Mission,
} from '../types/battle';
import {
  EMPIRE_ID,
  PLANNED_DURATION_SEC,
  WOLF_PERSONA,
} from '../data/wolf';

/** 簡單字串 hash → 32-bit unsigned */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 seeded PRNG */
export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SettleOptions {
  forceFailMode?: boolean;
  /** 若提供，強制使用此 status（測試用） */
  forceStatus?: BattleStatus;
  /** 實際演示耗時（秒）；寫入 actual_duration_sec */
  demoElapsedSec?: number;
  now?: Date;
}

const FAIL_STATUSES: BattleStatus[] = [
  'failed_risk_breach',
  'failed_timeout',
  'failed_data',
  'failed_constraint',
];

const BREACH_BY_STATUS: Record<string, string> = {
  failed_risk_breach: 'RISK_MAX_DRAWDOWN',
  failed_timeout: 'ENGINE_GRACE_TIMEOUT',
  failed_data: 'FEED_UNAVAILABLE',
  failed_constraint: 'CONSTRAINT_VIOLATION',
};

const STAKE = 10_000;

/**
 * 由 sandbox_run_id 決定績效數字（決定性，與 status 無關）。
 * RNG 抽取順序固定，保證重放一致。
 */
export function deriveMetricsFromRunId(sandbox_run_id: string): {
  realized_pnl: number;
  return_pct: number;
  max_drawdown: number;
  trade_count: number;
  /** seeded 失敗骰（0..1）；&lt;0.1 → 自然失敗 */
  failRoll: number;
  failIdx: number;
  profitBias: number;
} {
  const rng = createRng(hashString(sandbox_run_id));
  const rawReturn = rng();
  const rawDd = rng();
  const rawTrades = rng();
  const failRoll = rng();
  const failIdx = Math.floor(rng() * FAIL_STATUSES.length) % FAIL_STATUSES.length;
  const profitBias = rng();

  // Happy path 偏向正報酬：~85% 正、~15% 小虧（數字本身；status 另決）
  let return_pct: number;
  if (profitBias < 0.85) {
    return_pct = 0.5 + rawReturn * 7.5; // +0.5 ~ +8
  } else {
    return_pct = -(0.2 + rawReturn * 2.5); // -0.2 ~ -2.7
  }
  return_pct = Math.round(return_pct * 100) / 100;
  const realized_pnl = Math.round(STAKE * (return_pct / 100) * 100) / 100;
  const max_drawdown = Math.round((1 + rawDd * 4) * 100) / 100;
  const trade_count = 3 + Math.floor(rawTrades * 12);

  return {
    realized_pnl,
    return_pct,
    max_drawdown,
    trade_count,
    failRoll,
    failIdx,
    profitBias,
  };
}

export function deriveOutcomeFromRunId(
  sandbox_run_id: string,
  opts: SettleOptions = {},
): Pick<
  BattleResult,
  | 'status'
  | 'realized_pnl'
  | 'return_pct'
  | 'max_drawdown'
  | 'trade_count'
  | 'breach_code'
> {
  const m = deriveMetricsFromRunId(sandbox_run_id);

  let status: BattleStatus;
  if (opts.forceStatus) {
    status = opts.forceStatus;
  } else if (opts.forceFailMode) {
    status = FAIL_STATUSES[m.failIdx];
  } else if (m.failRoll < 0.1) {
    status = FAIL_STATUSES[m.failIdx];
  } else {
    status = 'completed';
  }

  const breach_code =
    status === 'completed' ? null : (BREACH_BY_STATUS[status] ?? 'UNKNOWN');

  return {
    status,
    realized_pnl: m.realized_pnl,
    return_pct: m.return_pct,
    max_drawdown: m.max_drawdown,
    trade_count: m.trade_count,
    breach_code,
  };
}

export function settleMission(
  mission: Mission,
  opts: SettleOptions = {},
): BattleResult {
  const now = opts.now ?? new Date();
  const outcome = deriveOutcomeFromRunId(mission.sandbox_run_id, opts);
  const actual =
    opts.demoElapsedSec ??
    Math.max(
      2,
      Math.min(
        4,
        Math.round((Date.now() - Date.parse(mission.started_at)) / 1000) || 3,
      ),
    );

  const result: BattleResult = {
    result_id: `res_${hashString(mission.sandbox_run_id).toString(16)}`,
    mission_id: mission.mission_id,
    agent_id: mission.agent_id,
    empire_id: EMPIRE_ID,
    created_at: mission.started_at,
    settled_at: now.toISOString(),

    sandbox_run_id: mission.sandbox_run_id,
    market_feed_id: 'feed_mock_crypto_v1',
    market_feed_version: '2026.09.15',
    planned_duration_sec: mission.planned_duration_sec,
    actual_duration_sec: actual,

    status: outcome.status,
    realized_pnl: outcome.realized_pnl,
    return_pct: outcome.return_pct,
    max_drawdown: outcome.max_drawdown,
    trade_count: outcome.trade_count,
    currency: 'sandbox_USD',

    decision_log_ref: `mock://decision/${mission.sandbox_run_id}`,
    constraint_snapshot: `mock://constraint/${WOLF_PERSONA.agent_id}`,
    skill_ids_used: ['skill_momentum_breakout', 'skill_trend_follow'],

    risk_limit_snapshot: 'max_dd=8%, max_pos=30%',
    breach_code: outcome.breach_code,

    real_trading: false,
  };

  return result;
}

/**
 * 重放：同 sandbox_run_id 必須得到相同 realized_pnl / return_pct。
 * 不一致 → 失格，不得進正式牆。
 */
export function replayConsistent(
  sandbox_run_id: string,
  realized_pnl: number,
  return_pct: number,
): boolean {
  const derived = deriveMetricsFromRunId(sandbox_run_id);
  return (
    derived.realized_pnl === realized_pnl && derived.return_pct === return_pct
  );
}

export function newSandboxRunId(seedExtra = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `srun_${t}_${r}${seedExtra ? '_' + seedExtra : ''}`;
}

export function newMissionId(): string {
  return `msn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * 測試用：組出可重放的 BattleResult。
 * 正式牆禁止用此預置當成長對照原料。
 */
export function buildMockHistory(count = 5): BattleResult[] {
  const seeds = [
    'hist_seed_alpha_01',
    'hist_seed_bravo_02',
    'hist_seed_charlie_03',
    'hist_seed_delta_04',
    'hist_seed_echo_05',
    'hist_seed_foxtrot_06',
  ];
  const results: BattleResult[] = [];
  const base = Date.parse('2026-09-14T10:00:00.000Z');

  for (let i = 0; i < Math.min(count, seeds.length); i++) {
    const sandbox_run_id = seeds[i];
    const mission: Mission = {
      mission_id: `msn_hist_${i + 1}`,
      agent_id: WOLF_PERSONA.agent_id,
      stake: STAKE,
      planned_duration_sec: PLANNED_DURATION_SEC,
      sandbox_run_id,
      started_at: new Date(base + i * 3600_000).toISOString(),
    };
    const settled = settleMission(mission, {
      forceStatus: 'completed',
      demoElapsedSec: PLANNED_DURATION_SEC,
      now: new Date(base + i * 3600_000 + PLANNED_DURATION_SEC * 1000),
    });
    if (
      replayConsistent(
        settled.sandbox_run_id,
        settled.realized_pnl,
        settled.return_pct,
      )
    ) {
      results.push(settled);
    }
  }
  return results;
}

/** 驗證 BattleResult 必填欄位齊全 */
export function assertBattleResultShape(r: BattleResult): string[] {
  const required: (keyof BattleResult)[] = [
    'result_id',
    'mission_id',
    'agent_id',
    'empire_id',
    'created_at',
    'settled_at',
    'sandbox_run_id',
    'market_feed_id',
    'market_feed_version',
    'planned_duration_sec',
    'actual_duration_sec',
    'status',
    'realized_pnl',
    'return_pct',
    'max_drawdown',
    'trade_count',
    'currency',
    'decision_log_ref',
    'constraint_snapshot',
    'skill_ids_used',
    'risk_limit_snapshot',
    'real_trading',
  ];
  const missing: string[] = [];
  for (const k of required) {
    if (r[k] === undefined || r[k] === null) {
      missing.push(String(k));
    }
  }
  if (r.real_trading !== false) missing.push('real_trading_must_be_false');
  if (!Array.isArray(r.skill_ids_used)) missing.push('skill_ids_used_not_array');
  return missing;
}
