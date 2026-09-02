import type { DevGotchiApiData, HealthStatus } from "../types/devgotchi";
import { HealthIndicator } from "./HealthIndicator";

type DevGotchiViewProps = {
  devgotchi: DevGotchiApiData;
  careError?: string;
  careLoading: boolean;
  onCare: () => void;
};

const clampLife = (value: number) => Math.min(100, Math.max(0, value));

function getHealthStatus(life: number): HealthStatus {
  if (life > 80) return "healthy";
  if (life >= 50) return "warning";
  return "critical";
}

export function DevGotchiView({
  devgotchi,
  careError,
  careLoading,
  onCare,
}: DevGotchiViewProps) {
  const life = clampLife(devgotchi.vida_actual);
  const health = getHealthStatus(life);

  return (
    <article className={`devgotchi-card devgotchi-card--${health}`}>
      <header className="devgotchi-card__header">
        <div>
          <p className="devgotchi-card__eyebrow">Tu mascota digital</p>
          <h2>{devgotchi.nombre}</h2>
        </div>
        <span className="health-chip">Nivel {life}</span>
      </header>

      <HealthIndicator health={health} />

      <section className="life" aria-labelledby="life-label">
        <div className="life__heading">
          <h3 id="life-label">Vida</h3>
          <strong>{life}/100</strong>
        </div>
        <progress
          className={`life__progress life__progress--${health}`}
          value={life}
          max="100"
          aria-label={`Vida de ${devgotchi.nombre}: ${life} de 100`}
        >
          {life}%
        </progress>
      </section>

      <div className="care-action">
        <div>
          <strong>¿Necesita atención?</strong>
          <span>Cuidarlo recupera 10 puntos de vida.</span>
        </div>
        <button type="button" onClick={onCare} disabled={careLoading || life === 100}>
          <span aria-hidden="true">♥</span>
          {careLoading ? "Cuidando…" : life === 100 ? "Vida completa" : "Cuidar +10"}
        </button>
      </div>
      {careError ? <p className="action-error" role="alert">{careError}</p> : null}
    </article>
  );
}
