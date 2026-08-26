export type ProjectStatus =
  | "success"
  | "failure"
  | "running"
  | "queued"
  | "error"
  | "unknown";

export type HealthStatus =
  | "healthy"
  | "warning"
  | "critical"
  | "unknown";

export type DevGotchiData = {
  project: string;
  branch: string;
  workflow: string;
  status: ProjectStatus;
  health: HealthStatus;
  vida: number;
  message: string;
  timestamp: string;
};

export type HealthResponse = {
  ok: boolean;
  data: DevGotchiData;
};
