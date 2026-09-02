import type { HealthStatus } from "../types/devgotchi";

type HealthIndicatorProps = {
  health: HealthStatus;
};

const healthDetails: Record<
  HealthStatus,
  { expression: string; label: string; description: string }
> = {
  healthy: {
    expression: "◕‿◕",
    label: "Saludable",
    description: "DevGotchi está feliz y saludable",
  },
  warning: {
    expression: "◉_◉",
    label: "Bajo",
    description: "DevGotchi está atento y necesita supervisión",
  },
  critical: {
    expression: "×﹏×",
    label: "Crítico",
    description: "DevGotchi está enfermo y necesita ayuda",
  },
  unknown: {
    expression: "・_・?",
    label: "Desconocido",
    description: "No se conoce el estado de DevGotchi",
  },
};

export function HealthIndicator({ health }: HealthIndicatorProps) {
  const details = healthDetails[health];

  return (
    <div
      className={`health-indicator health-indicator--${health}`}
      role="img"
      aria-label={details.description}
    >
      <span className="health-indicator__antenna" aria-hidden="true" />
      <span className="health-indicator__face" aria-hidden="true">
        {details.expression}
      </span>
      <span className="health-indicator__label">{details.label}</span>
    </div>
  );
}
