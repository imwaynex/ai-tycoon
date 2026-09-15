/** BattleResult — 對齊出征閉環實作基準 §3 */

export type BattleStatus =
  | 'completed'
  | 'failed_risk_breach'
  | 'failed_timeout'
  | 'failed_data'
  | 'failed_constraint';

export type AgentStatus = 'ready' | 'in_progress';

export type RejectReason =
  | 'agent_not_ready'
  | 'active_mission'
  | 'insufficient_stake'
  | 'sandbox_unhealthy'
  | null;

export interface BattleResult {
  // identity
  result_id: string;
  mission_id: string;
  agent_id: string;
  empire_id: string;
  created_at: string;
  settled_at: string;

  // run
  sandbox_run_id: string;
  market_feed_id: string;
  market_feed_version: string;
  planned_duration_sec: number;
  actual_duration_sec: number;

  // outcome
  status: BattleStatus;
  realized_pnl: number;
  return_pct: number;
  max_drawdown: number;
  trade_count: number;
  currency: 'sandbox_USD';

  // attribution
  decision_log_ref: string;
  constraint_snapshot: string;
  skill_ids_used: string[];

  // risk
  risk_limit_snapshot: string;
  breach_code: string | null;

  // forced
  real_trading: false;
}

/** UI 可講欄位（其餘不可當劇情編造） */
export type SpeakableFields = Pick<
  BattleResult,
  | 'status'
  | 'realized_pnl'
  | 'return_pct'
  | 'max_drawdown'
  | 'trade_count'
  | 'actual_duration_sec'
  | 'breach_code'
>;

export type ScreenId = 'home' | 'in_progress' | 'return';

export interface Agent {
  agent_id: string;
  name: string;
  role: string;
  tagline: string;
  style: string;
  specialty: string;
  risk_profile: string;
  status: AgentStatus;
}

export interface Empire {
  empire_id: string;
  available_stake: number;
  sandbox_healthy: boolean;
}

export interface Mission {
  mission_id: string;
  agent_id: string;
  stake: number;
  planned_duration_sec: number;
  sandbox_run_id: string;
  started_at: string;
}

export interface ExpeditionState {
  screen: ScreenId;
  hasAgent: boolean;
  agent: Agent | null;
  empire: Empire;
  activeMission: Mission | null;
  lastResult: BattleResult | null;
  battleWall: BattleResult[];
  rejectReason: RejectReason;
  /** 已出征秒數（演示用，畫面顯示） */
  elapsedSec: number;
  /** 隱藏失敗強制開關（dev） */
  forceFailMode: boolean;
}
