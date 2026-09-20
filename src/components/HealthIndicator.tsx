import type { HealthStatus } from "../types/devgotchi";

type HealthIndicatorProps = {
  health: HealthStatus;
  activity?: "idle" | "feeding" | "playing" | "caring";
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

const activityExpressions = {
  feeding: "◕ω◕",
  playing: "◕‿◕",
  caring: "ˆ‿ˆ",
};

export function HealthIndicator({ health, activity = "idle" }: HealthIndicatorProps) {
  const details = healthDetails[health];
  const expression = activity === "idle" ? details.expression : activityExpressions[activity];

  return (
    <div
      className={`health-indicator health-indicator--${health} health-indicator--${activity}`}
      role="img"
      aria-label={details.description}
    >
      <span className="health-indicator__antenna" aria-hidden="true" />
      <span className="health-indicator__face" aria-hidden="true">
        {expression}
      </span>
      <span className="health-indicator__label">{details.label}</span>
    </div>
  );
}
