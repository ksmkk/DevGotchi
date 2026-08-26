import type { DevGotchiData } from "../types/devgotchi";
import { HealthIndicator } from "./HealthIndicator";

type DevGotchiCardProps = {
  data: DevGotchiData;
};

const clampLife = (value: number) => Math.min(100, Math.max(0, value));

export function DevGotchiCard({ data }: DevGotchiCardProps) {
  const life = clampLife(data.vida);

  return (
    <article className={`devgotchi-card devgotchi-card--${data.health}`}>
      <header className="devgotchi-card__header">
        <div>
          <p className="devgotchi-card__eyebrow">Monitor de proyecto</p>
          <h1>{data.project}</h1>
        </div>
        <span className={`status-badge status-badge--${data.status}`}>
          <span className="status-badge__dot" aria-hidden="true" />
          {data.status}
        </span>
      </header>

      <HealthIndicator health={data.health} />

      <section className="life" aria-labelledby="life-label">
        <div className="life__heading">
          <h2 id="life-label">Vida</h2>
          <strong>{life}/100</strong>
        </div>
        <progress
          className={`life__progress life__progress--${data.health}`}
          value={life}
          max="100"
          aria-label={`Vida de DevGotchi: ${life} de 100`}
        >
          {life}%
        </progress>
      </section>

      <p className="devgotchi-card__message">{data.message}</p>

      <dl className="project-details">
        <div>
          <dt>Rama</dt>
          <dd>{data.branch}</dd>
        </div>
        <div>
          <dt>Workflow</dt>
          <dd>{data.workflow}</dd>
        </div>
      </dl>

      <footer className="devgotchi-card__footer">
        Actualizado el{" "}
        <time dateTime={data.timestamp}>
          {new Intl.DateTimeFormat("es-CL", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(data.timestamp))}
          {" UTC"}
        </time>
      </footer>
    </article>
  );
}
