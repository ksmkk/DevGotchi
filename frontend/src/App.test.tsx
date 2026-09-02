import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../src/App";
import { DevGotchiView } from "../../src/components/DevGotchiView";
import {
  CARE_FOR_DEVGOTCHI,
  CONNECT_REPOSITORY,
  GET_DEVGOTCHI,
} from "../../src/graphql/queries";

const devgotchi = {
  __typename: "DevGotchi",
  id: "1",
  nombre: "Pixel",
  vida_actual: 72,
  repository_url: null,
};

const queryMock = {
  request: { query: GET_DEVGOTCHI },
  result: { data: { devgotchi } },
};

describe("vista interactiva de DevGotchi", () => {
  it("muestra carga y actualiza la interfaz con datos de la API", async () => {
    render(
      <MockedProvider mocks={[queryMock]}>
        <App />
      </MockedProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Cargando DevGotchi");
    expect(await screen.findByRole("heading", { name: "Pixel" })).toBeVisible();
    expect(screen.getByText("72/100")).toBeVisible();
    expect(screen.getByRole("img", {
      name: "DevGotchi está atento y necesita supervisión",
    })).toBeVisible();
  });

  it("cuida la mascota y actualiza la vida sin recargar", async () => {
    const careMock = {
      request: { query: CARE_FOR_DEVGOTCHI },
      result: {
        data: { cuidarDevgotchi: { ...devgotchi, vida_actual: 82 } },
      },
    };

    render(
      <MockedProvider mocks={[queryMock, careMock]}>
        <App />
      </MockedProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Cuidar \+10/i }));
    expect(await screen.findByText("82/100")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Vida de Pixel: 82 de 100" }))
      .toHaveAttribute("value", "82");
  });

  it("conecta una URL de GitHub y muestra el repositorio", async () => {
    const repositoryUrl = "https://github.com/devgotchi/app";
    const connectMock = {
      request: {
        query: CONNECT_REPOSITORY,
        variables: { repositoryUrl },
      },
      result: {
        data: {
          conectarRepositorio: { ...devgotchi, repository_url: repositoryUrl },
        },
      },
    };

    render(
      <MockedProvider mocks={[queryMock, connectMock]}>
        <App />
      </MockedProvider>,
    );

    const input = await screen.findByLabelText("URL del repositorio de GitHub");
    fireEvent.change(input, { target: { value: `${repositoryUrl}.git` } });
    fireEvent.click(screen.getByRole("button", { name: "Conectar" }));

    expect(await screen.findByText("Repositorio conectado correctamente.")).toBeVisible();
    expect(screen.getByRole("link", { name: "devgotchi/app" }))
      .toHaveAttribute("href", repositoryUrl);
  });

  it("rechaza URLs que no pertenecen a un repositorio de GitHub", async () => {
    render(
      <MockedProvider mocks={[queryMock]}>
        <App />
      </MockedProvider>,
    );

    const input = await screen.findByLabelText("URL del repositorio de GitHub");
    fireEvent.change(input, { target: { value: "https://example.com/proyecto" } });
    fireEvent.click(screen.getByRole("button", { name: "Conectar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ingresa una URL válida");
  });

  it("muestra el error de consulta y permite reintentar", async () => {
    render(
      <MockedProvider mocks={[{
        request: { query: GET_DEVGOTCHI },
        error: new Error("Backend no disponible"),
      }]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend no disponible");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});

describe("estados visuales de la mascota", () => {
  it.each([
    [90, "healthy", "Saludable"],
    [65, "warning", "Bajo"],
    [25, "critical", "Crítico"],
  ])("muestra vida %i como %s", (life, cssState, label) => {
    const { container } = render(
      <DevGotchiView
        devgotchi={{ ...devgotchi, vida_actual: life }}
        careLoading={false}
        onCare={() => undefined}
      />,
    );

    expect(container.querySelector("article"))
      .toHaveClass(`devgotchi-card--${cssState}`);
    expect(screen.getByText(label)).toBeVisible();
  });
});
