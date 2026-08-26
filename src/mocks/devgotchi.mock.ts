import type { HealthResponse } from "../types/devgotchi";

export const devGotchiMock: HealthResponse = {
  ok: true,
  data: {
    project: "DevGotchi",
    branch: "main",
    workflow: "CI",
    status: "success",
    health: "healthy",
    vida: 100,
    message: "El proyecto funciona correctamente.",
    timestamp: "2026-08-25T18:20:00Z",
  },
};
