import type { Agent } from '../types/battle';

/** 預置 WOLF — 對齊 WOLF-人設卡-定稿.md */
export const WOLF_PERSONA = {
  agent_id: 'agent_wolf',
  name: 'WOLF',
  role: '動能交易員',
  tagline: '突破就上；約束一來，立刻收手。',
  style: '短句、果斷、不回聊。出征時離開介面，歸來只帶戰果。',
  specialty: '動能突破、趨勢跟隨',
  risk_profile: '偏進攻：願意用較大回撤換報酬；任務 risk_limit 為硬頂，觸線即折返',
  differentiation:
    '風險偏好偏高 ＋ 動能視角 ＋ 約束優先於感覺（不是空喊「我很激進」）',
} as const;

export function createWolfAgent(status: Agent['status'] = 'ready'): Agent {
  return {
    agent_id: WOLF_PERSONA.agent_id,
    name: WOLF_PERSONA.name,
    role: WOLF_PERSONA.role,
    tagline: WOLF_PERSONA.tagline,
    style: WOLF_PERSONA.style,
    specialty: WOLF_PERSONA.specialty,
    risk_profile: WOLF_PERSONA.risk_profile,
    status,
  };
}

export const OPENING_LINE =
  '歡迎來到 AI Tycoon。你的目標，是建立全世界最強的 AI 交易帝國。';

export const EMPIRE_ID = 'empire_demo_01';
export const PLANNED_DURATION_SEC = 300;
export const DEMO_WAIT_MS_MIN = 2000;
export const DEMO_WAIT_MS_MAX = 4000;
export const BATTLE_WALL_MAX = 20;
export const MISSION_STAKE = 10_000;
