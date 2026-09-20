import { useMutation, useQuery } from "@apollo/client/react";
import { useState, type FormEvent } from "react";
import { DevGotchiView } from "./components/DevGotchiView";
import {
  CARE_FOR_DEVGOTCHI,
  CONNECT_REPOSITORY,
  GET_DEVGOTCHI,
} from "./graphql/queries";
import type { DevGotchiApiData } from "./types/devgotchi";

type DevGotchiQueryData = { devgotchi: DevGotchiApiData | null };
type CareMutationData = { cuidarDevgotchi: DevGotchiApiData };
type ConnectMutationData = { conectarRepositorio: DevGotchiApiData };
type ConnectMutationVariables = { repositoryUrl: string };

const githubRepositoryPattern = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/?$/i;

function App() {
  const showTechnicalOptions = import.meta.env.VITE_SHOW_TECHNICAL_OPTIONS === "true";
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const { data, error, loading, refetch } = useQuery<DevGotchiQueryData>(
    GET_DEVGOTCHI,
  );
  const [careForDevGotchi, careState] = useMutation<CareMutationData>(
    CARE_FOR_DEVGOTCHI,
    {
      update(cache, result) {
        if (result.data?.cuidarDevgotchi) {
          cache.writeQuery({
            query: GET_DEVGOTCHI,
            data: { devgotchi: result.data.cuidarDevgotchi },
          });
        }
      },
    },
  );
  const [connectRepository, connectState] = useMutation<
    ConnectMutationData,
    ConnectMutationVariables
  >(CONNECT_REPOSITORY, {
    update(cache, result) {
      if (result.data?.conectarRepositorio) {
        cache.writeQuery({
          query: GET_DEVGOTCHI,
          data: { devgotchi: result.data.conectarRepositorio },
        });
      }
    },
  });

  if (loading) {
    return (
      <main className="app-shell app-shell--centered">
        <p className="query-status" role="status">Cargando DevGotchi…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="query-status query-status--error" role="alert">
          <h1>No se pudo cargar DevGotchi</h1>
          <p>{error.message}</p>
          <button type="button" onClick={() => void refetch()}>Reintentar</button>
        </section>
      </main>
    );
  }

  if (!data?.devgotchi) {
    return (
      <main className="app-shell app-shell--centered">
        <section className="query-status" role="status">
          <h1>No se encontró DevGotchi</h1>
          <p>La API no devolvió una mascota.</p>
        </section>
      </main>
    );
  }

  const devgotchi = data.devgotchi;

  async function handleCare() {
    await careForDevGotchi({
      optimisticResponse: {
        cuidarDevgotchi: {
          ...devgotchi,
          __typename: "DevGotchi",
          vida_actual: Math.min(100, devgotchi.vida_actual + 10),
        },
      },
    });
  }

  async function handleRepositorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = repositoryUrl.trim().replace(/\.git\/?$/i, "");

    if (!githubRepositoryPattern.test(normalizedUrl)) {
      setFormError("Ingresa una URL válida: https://github.com/usuario/repositorio");
      return;
    }

    setFormError(null);
    setConnectionMessage(null);

    try {
      await connectRepository({ variables: { repositoryUrl: normalizedUrl } });
      setRepositoryUrl("");
      setConnectionMessage("Repositorio conectado correctamente.");
    } catch {
      // Apollo expone el detalle mediante connectState.error.
    }
  }

  return (
    <main className="app-shell">
      <div className="dashboard">
        <header className="dashboard__header">
          <div>
            <p className="dashboard__eyebrow">Panel de compañero</p>
            <h1>Cuida tu código. Cuida tu DevGotchi.</h1>
            <p>La salud de tu mascota refleja la actividad de tu repositorio.</p>
          </div>
        </header>

        <div className="dashboard__grid">
          <DevGotchiView
            devgotchi={devgotchi}
            careError={careState.error?.message}
            careLoading={careState.loading}
            onCare={() => void handleCare()}
          />

          <aside className="dashboard__sidebar">
            <section className="panel repository-panel">
              <div className="panel__icon" aria-hidden="true">⌘</div>
              <div>
                <p className="panel__eyebrow">Integración</p>
                <h2>Conecta tu repositorio</h2>
              </div>
              <p className="panel__description">
                Vincula GitHub para que commits y actividad alimenten la salud de tu mascota.
              </p>

              {devgotchi.repository_url ? (
                <div className="repository-connected">
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>Repositorio conectado</strong>
                    <a href={devgotchi.repository_url} target="_blank" rel="noreferrer">
                      {devgotchi.repository_url.replace("https://github.com/", "")}
                    </a>
                  </div>
                </div>
              ) : null}

              <form className="repository-form" onSubmit={(event) => void handleRepositorySubmit(event)}>
                <label htmlFor="repository-url">URL del repositorio de GitHub</label>
                <div className="repository-form__row">
                  <input
                    id="repository-url"
                    type="url"
                    value={repositoryUrl}
                    onChange={(event) => setRepositoryUrl(event.target.value)}
                    placeholder="https://github.com/usuario/repo"
                    aria-describedby="repository-feedback"
                  />
                  <button type="submit" disabled={connectState.loading}>
                    {connectState.loading ? "Conectando…" : "Conectar"}
                  </button>
                </div>
                <p
                  id="repository-feedback"
                  className={formError || connectState.error ? "form-feedback form-feedback--error" : "form-feedback"}
                  role={formError || connectState.error ? "alert" : "status"}
                >
                  {formError ?? connectState.error?.message ?? connectionMessage ?? "Solo repositorios de GitHub."}
                </p>
              </form>
            </section>

            <section className="panel state-panel">
              <div className="panel__heading">
                <div>
                  <p className="panel__eyebrow">Estado visual</p>
                  <h2>¿Cómo se siente?</h2>
                </div>
              </div>
              <ul className="state-list">
                <li><span className="state-dot state-dot--healthy" /><strong>Saludable</strong><small>81–100 de vida</small></li>
                <li><span className="state-dot state-dot--low" /><strong>Bajo</strong><small>50–80 de vida</small></li>
                <li><span className="state-dot state-dot--critical" /><strong>Crítico</strong><small>0–49 de vida</small></li>
              </ul>
            </section>

            {showTechnicalOptions ? (
              <details className="panel technical-options">
                <summary>Opciones técnicas</summary>
                <div className="technical-options__content">
                  <p className="panel__eyebrow">Diagnóstico interno</p>
                  <span className="connection-pill">
                    <span aria-hidden="true" /> GraphQL conectado
                  </span>
                  <p>Visible sólo en despliegues habilitados para el equipo técnico.</p>
                </div>
              </details>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default App;
