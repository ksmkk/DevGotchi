import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import type { FormEvent } from "react";
import { DevGotchiCard } from "./components/DevGotchiCard";
import type { DevGotchiData, HealthStatus, ProjectStatus } from "./types/devgotchi";

const DEVGOTCHI_QUERY = gql`
  query DevGotchi {
    devgotchi {
      id
      nombre
      vida_actual
      repository_url
      devgotchiHealth
      devgotchiMood
    }
  }
`;

const CONNECT_REPOSITORY = gql`
  mutation ConnectRepository($repositoryUrl: String!) {
    conectarRepositorio(repositoryUrl: $repositoryUrl) {
      id
      nombre
      vida_actual
      repository_url
      devgotchiHealth
      devgotchiMood
    }
  }
`;

type DevGotchiQuery = {
  devgotchi: {
    id: string;
    nombre: string;
    vida_actual: number;
    repository_url: string | null;
    devgotchiHealth: number;
    devgotchiMood: string;
  } | null;
};

function toCardData(value: NonNullable<DevGotchiQuery["devgotchi"]>): DevGotchiData {
  const health: HealthStatus = value.vida_actual >= 80
    ? "healthy"
    : value.vida_actual > 25 ? "warning" : "critical";
  const status: ProjectStatus = health === "healthy"
    ? "success"
    : health === "critical" ? "failure" : "running";

  return {
    project: value.nombre,
    branch: "main",
    workflow: "GitHub Actions",
    status,
    health,
    vida: value.vida_actual,
    message: value.repository_url
      ? `Repositorio conectado: ${value.repository_url}`
      : "Conecta un repositorio para comenzar a monitorizarlo.",
    timestamp: new Date().toISOString(),
  };
}

function App() {
  const { data, loading, error } = useQuery<DevGotchiQuery>(DEVGOTCHI_QUERY, {
    pollInterval: 5000,
  });
  const [connectRepository, { loading: connecting, error: connectionError }] = useMutation(
    CONNECT_REPOSITORY,
    { refetchQueries: [DEVGOTCHI_QUERY] },
  );

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const repositoryUrl = String(form.get("repositoryUrl") || "").trim();
    if (!repositoryUrl) return;

    await connectRepository({ variables: { repositoryUrl } });
    event.currentTarget.reset();
  }

  return (
    <main className="app-shell">
      <section className="app-content">
        <form className="repository-form" onSubmit={handleConnect}>
          <div>
            <p className="repository-form__eyebrow">Conexión del proyecto</p>
            <h1>Vigila la salud de tu repositorio</h1>
          </div>
          <label htmlFor="repositoryUrl">URL de GitHub</label>
          <div className="repository-form__controls">
            <input
              id="repositoryUrl"
              name="repositoryUrl"
              type="url"
              placeholder="https://github.com/usuario/proyecto"
              pattern="https://github\\.com/.+/.+"
              required
            />
            <button type="submit" disabled={connecting}>
              {connecting ? "Conectando..." : "Conectar"}
            </button>
          </div>
          {connectionError && <p className="form-message form-message--error">No se pudo conectar el repositorio.</p>}
        </form>

        {loading && <p className="state-message">Cargando DevGotchi...</p>}
        {error && <p className="state-message state-message--error">No se pudo cargar el DevGotchi.</p>}
        {!loading && !error && data?.devgotchi && <DevGotchiCard data={toCardData(data.devgotchi)} />}
        {!loading && !error && !data?.devgotchi && (
          <p className="state-message">Conecta un repositorio para comenzar a monitorizarlo.</p>
        )}
      </section>
    </main>
  );
}

export default App;
