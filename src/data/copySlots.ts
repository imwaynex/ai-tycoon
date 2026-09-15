/**
 * 六槽文案 — 對齊 文案槽-六槽-定稿.md
 * 數字僅占位，由引擎 BattleResult 填入；禁止發明 PnL 進靜態文案。
 */

export const COPY = {
  /** ① 首屏空態 */
  emptyHome: `帝國還沒有大將。
先收下 WOLF，再談出征。`,

  /** ② 不可派 */
  cannotDispatch: (reject_reason: string) =>
    `WOLF 今晚不能派。
原因：${reject_reason}。
換條件，或等它 ready 再出征。`,

  /** ③ 出征中 */
  inProgress: (actual_duration_sec: number | string) =>
    `WOLF 已在路上。
已出征 ${actual_duration_sec}。
別盯盤——經營者等戰報。`,

  /** ④ 歸來成功（status＝completed，含虧損亦可套） */
  returnSuccess: (p: {
    realized_pnl: string;
    return_pct: string;
    max_drawdown: string;
    trade_count: number | string;
    actual_duration_sec: string;
  }) =>
    `WOLF 歸來。
realized_pnl ${p.realized_pnl} · return_pct ${p.return_pct} · max_drawdown ${p.max_drawdown} · 成交 ${p.trade_count} 筆 · 耗時 ${p.actual_duration_sec}。
一筆可稽核戰績，已記入帝國。`,

  /** ⑤ 歸來失敗（failed_*） */
  returnFail: (p: { status: string; breach_code: string }) =>
    `WOLF 折返。
status ${p.status} · breach_code ${p.breach_code}。
這次沒帶回可進帳的戰果——規則守住了。`,

  /** ⑥ 尚無戰績 */
  emptyWall: `戰績牆還是空的。
派 WOLF 出去，才有故事可截。`,

  auditHint: '本戰果可重播／可稽核',
} as const;

export const REJECT_REASON_ZH: Record<string, string> = {
  agent_not_ready: 'Agent 尚未 ready',
  active_mission: '已有進行中的任務',
  insufficient_stake: '模擬籌碼不足',
  sandbox_unhealthy: '沙盒環境不健康',
};

export function formatPnl(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)} sandbox_USD`;
}

export function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} 分` : `${m} 分 ${s} 秒`;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    completed: 'completed（正常結算）',
    failed_risk_breach: 'failed_risk_breach',
    failed_timeout: 'failed_timeout',
    failed_data: 'failed_data',
    failed_constraint: 'failed_constraint',
  };
  return map[status] ?? status;
}
