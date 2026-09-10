import { useState } from "react";
import type { DevGotchiApiData, HealthStatus } from "../types/devgotchi";
import { HealthIndicator } from "./HealthIndicator";

type DevGotchiViewProps = {
  devgotchi: DevGotchiApiData;
  careError?: string;
  careLoading: boolean;
  onCare: () => Promise<void> | void;
};

type PetActivity = "idle" | "feeding" | "playing" | "caring";

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
  const [activity, setActivity] = useState<PetActivity>("idle");
  const [interactionMessage, setInteractionMessage] = useState(
    `${devgotchi.nombre} te está esperando.`,
  );

  function interact(nextActivity: PetActivity, message: string) {
    setActivity(nextActivity);
    setInteractionMessage(message);
  }

  async function care() {
    interact("caring", `Estás cuidando a ${devgotchi.nombre}. ¡Se siente mucho mejor!`);
    try {
      await onCare();
    } catch {
      setInteractionMessage(`No pudimos cuidar a ${devgotchi.nombre}. Inténtalo otra vez.`);
    }
  }

  return (
    <article className={`devgotchi-card devgotchi-card--${health}`}>
      <header className="devgotchi-card__header">
        <div>
          <p className="devgotchi-card__eyebrow">Tu mascota digital</p>
          <h2>{devgotchi.nombre}</h2>
        </div>
        <span className="health-chip">Nivel {life}</span>
      </header>

      <div className="pet-stage" aria-live="polite">
        <span className="pet-stage__spark pet-stage__spark--one" aria-hidden="true">✦</span>
        <span className="pet-stage__spark pet-stage__spark--two" aria-hidden="true">·</span>
        <HealthIndicator health={health} activity={activity} />
        <p className="pet-message">{interactionMessage}</p>
      </div>

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

      <section className="pet-controls" aria-labelledby="pet-controls-title">
        <div className="pet-controls__heading">
          <div>
            <p className="devgotchi-card__eyebrow">Momento de conectar</p>
            <h3 id="pet-controls-title">Cuida a tu compañero</h3>
          </div>
          <span>Elige una acción</span>
        </div>
        <div className="pet-controls__grid">
          <button
            type="button"
            className="pet-control pet-control--feed"
            onClick={() => interact("feeding", `¡Ñam! ${devgotchi.nombre} disfrutó su snack.`)}
          >
            <span className="pet-control__icon" aria-hidden="true">🍎</span>
            <strong>Alimentar</strong>
            <small>Recupera energía</small>
          </button>
          <button
            type="button"
            className="pet-control pet-control--play"
            onClick={() => interact("playing", `¡Qué divertido! ${devgotchi.nombre} está feliz.`)}
          >
            <span className="pet-control__icon" aria-hidden="true">★</span>
            <strong>Jugar</strong>
            <small>Mejora su ánimo</small>
          </button>
          <button
            type="button"
            className="pet-control pet-control--care"
            onClick={() => void care()}
            disabled={careLoading || life === 100}
          >
            <span className="pet-control__icon" aria-hidden="true">♥</span>
            <strong>
              {careLoading ? "Cuidando…" : life === 100 ? "Vida completa" : "Cuidar +10"}
            </strong>
            <small>Recupera vida</small>
          </button>
        </div>
      </section>
      {careError ? <p className="action-error" role="alert">{careError}</p> : null}
    </article>
  );
}
