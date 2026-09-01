import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import { GET_PROJECTS } from "../../src/graphql/queries";

const variables = { status: "active", limit: 1, offset: 0 };

const project = {
  id: 1,
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  name: "DevGotchi",
  description: "Mascota del proyecto",
  repositoryUrl: "https://github.com/example/devgotchi",
  status: "active",
  devgotchiHealth: 85,
  devgotchiMood: "happy",
  lastCommitDate: "2026-08-31T12:00:00.000Z",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-31T12:00:00.000Z",
};

describe("App GraphQL integration", () => {
  it("shows loading and renders the project returned by Apollo", async () => {
    render(
      <MockedProvider mocks={[{
        request: { query: GET_PROJECTS, variables },
        result: { data: { projects: [project] } },
      }]}>
        <App />
      </MockedProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cargando DevGotchi");
    expect(await screen.findByRole("heading", { name: "DevGotchi" })).toBeVisible();
    expect(screen.getByText("85/100")).toBeVisible();
    expect(screen.getByText("¡El proyecto está vivo y progresando!")).toBeVisible();
  });

  it("renders an empty state when there are no active projects", async () => {
    render(
      <MockedProvider mocks={[{
        request: { query: GET_PROJECTS, variables },
        result: { data: { projects: [] } },
      }]}>
        <App />
      </MockedProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Aún no hay proyectos activos" }),
    ).toBeVisible();
  });

  it("shows the API error and a retry action", async () => {
    render(
      <MockedProvider mocks={[{
        request: { query: GET_PROJECTS, variables },
        error: new Error("Backend no disponible"),
      }]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend no disponible");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});
