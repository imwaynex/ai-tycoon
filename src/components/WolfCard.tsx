import type { Agent } from '../types/battle';
import { WOLF_PERSONA } from '../data/wolf';

export function WolfCard({ agent }: { agent: Agent }) {
  return (
    <article className="wolf-card" aria-label="WOLF 角色卡">
      <header className="wolf-card__header">
        <div className="wolf-card__avatar" aria-hidden>
          🐺
        </div>
        <div>
          <h2 className="wolf-card__name">{agent.name}</h2>
          <p className="wolf-card__role">{agent.role}</p>
        </div>
        <span className={`wolf-card__status wolf-card__status--${agent.status}`}>
          {agent.status === 'ready' ? 'ready' : '作戰中'}
        </span>
      </header>
      <p className="wolf-card__tagline">「{agent.tagline}」</p>
      <dl className="wolf-card__meta">
        <div>
          <dt>風格</dt>
          <dd>{agent.style}</dd>
        </div>
        <div>
          <dt>專長</dt>
          <dd>{agent.specialty}</dd>
        </div>
        <div>
          <dt>風險屬性</dt>
          <dd>{agent.risk_profile}</dd>
        </div>
        <div>
          <dt>差異來自</dt>
          <dd>{WOLF_PERSONA.differentiation}</dd>
        </div>
      </dl>
    </article>
  );
}
