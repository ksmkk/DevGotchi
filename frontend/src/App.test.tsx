import { MockedProvider } from "@apollo/client/testing/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import { DevGotchiView } from "../../src/components/DevGotchiView";
import {
  ANALYZE_REPOSITORY,
  CONNECT_REPOSITORY,
  GET_DEVGOTCHI,
  RENAME_DEVGOTCHI,
} from "../../src/graphql/queries";

const devgotchi = {
  __typename: "Devgotchi",
  id: "1",
  nombre: "Pixel",
  vida_actual: 72,
  repository_url: null,
  salud: {
    puntosVida: 72,
    ultimoCommit: null,
    estado: "Feliz",
  },
  diagnostico: null,
} as const;

const queryMock = {
  request: { query: GET_DEVGOTCHI },
  result: { data: { devgotchi } },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("analiza el repositorio y actualiza la vida sin recargar", async () => {
    const analysisMock = {
      request: { query: ANALYZE_REPOSITORY, variables: { projectId: "1" } },
      result: {
        data: { analizarRepositorio: { ...devgotchi, vida_actual: 82 } },
      },
    };

    render(
      <MockedProvider mocks={[queryMock, analysisMock]}>
        <App />
      </MockedProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Revisar salud/i }));
    expect(await screen.findByText("82/100")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Vida de Pixel: 82 de 100" }))
      .toHaveAttribute("value", "82");
  });

  it("permite alimentar y jugar con feedback visual inmediato", async () => {
    render(
      <MockedProvider mocks={[queryMock]}>
        <App />
      </MockedProvider>,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Alimentar/i }));
    expect(screen.getByText("¡Ñam! Pixel disfrutó su snack.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Jugar/i }));
    expect(screen.getByText("¡Qué divertido! Pixel está feliz.")).toBeVisible();
  });

  it("oculta el diagnóstico GraphQL en la interfaz general", async () => {
    render(
      <MockedProvider mocks={[queryMock]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Pixel" })).toBeVisible();
    expect(screen.queryByText("GraphQL conectado")).not.toBeInTheDocument();
    expect(screen.queryByText("Opciones técnicas")).not.toBeInTheDocument();
  });

  it("muestra el diagnóstico dentro de opciones cuando el despliegue lo autoriza", async () => {
    vi.stubEnv("VITE_SHOW_TECHNICAL_OPTIONS", "true");

    render(
      <MockedProvider mocks={[queryMock]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByText("Opciones técnicas")).toBeVisible();
    expect(screen.getByText("GraphQL conectado")).toBeInTheDocument();
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

  it("permite cambiar el nombre de la mascota sin renombrar el repositorio", async () => {
    const renameMock = {
      request: {
        query: RENAME_DEVGOTCHI,
        variables: { projectId: "1", nombre: "Byte" },
      },
      result: { data: { renombrarDevgotchi: { ...devgotchi, nombre: "Byte" } } },
    };

    render(
      <MockedProvider mocks={[queryMock, renameMock]}>
        <App />
      </MockedProvider>,
    );

    const input = await screen.findByLabelText("Nombre de la mascota");
    fireEvent.change(input, { target: { value: "Byte" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar" }));

    expect(await screen.findByRole("heading", { name: "Byte" })).toBeVisible();
  });

  it("muestra el formulario y crea el DevGotchi cuando la base está vacía", async () => {
    const repositoryUrl = "https://github.com/devgotchi/app";
    const emptyQueryMock = {
      request: { query: GET_DEVGOTCHI },
      result: { data: { devgotchi: null } },
    };
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
      <MockedProvider mocks={[emptyQueryMock, connectMock]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Conecta tu primer repositorio" }))
      .toBeVisible();
    expect(screen.queryByText("No se encontró DevGotchi")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("URL del repositorio de GitHub"), {
      target: { value: repositoryUrl },
    });
    fireEvent.click(screen.getByRole("button", { name: "Conectar" }));

    expect(await screen.findByRole("heading", { name: "Pixel" })).toBeVisible();
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

  it("traduce el error de red y explica cómo levantar la demo", async () => {
    render(
      <MockedProvider mocks={[{
        request: { query: GET_DEVGOTCHI },
        error: new TypeError("Failed to fetch"),
      }]}>
        <App />
      </MockedProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "El backend no está disponible",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("npm run demo");
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
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
        onRename={() => undefined}
        renameLoading={false}
      />,
    );

    expect(container.querySelector("article"))
      .toHaveClass(`devgotchi-card--${cssState}`);
    expect(screen.getByText(label)).toBeVisible();
  });
});
