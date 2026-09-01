import { useQuery } from "@apollo/client/react";
import { DevGotchiCard } from "./components/DevGotchiCard";
import { GET_PROJECTS } from "./graphql/queries";
import type { DevGotchiData, HealthStatus, ProjectStatus } from "./types/devgotchi";

type ProjectData = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  repositoryUrl: string | null;
  status: "active" | "archived" | "deleted";
  devgotchiHealth: number;
  devgotchiMood: "happy" | "neutral" | "sad" | "angry";
  lastCommitDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectsQueryData = {
  projects: ProjectData[];
};

type ProjectsQueryVariables = {
  status?: string;
  limit: number;
  offset: number;
};

const projectStatuses: Record<ProjectData["status"], ProjectStatus> = {
  active: "success",
  archived: "queued",
  deleted: "error",
};

const moodMessages: Record<ProjectData["devgotchiMood"], string> = {
  happy: "¡El proyecto está vivo y progresando!",
  neutral: "El proyecto está bien, pero podría mejorar.",
  sad: "El proyecto necesita atención.",
  angry: "¡El proyecto necesita atención urgente!",
};

function toCardData(project: ProjectData): DevGotchiData {
  const health: HealthStatus = project.devgotchiHealth > 80
    ? "healthy"
    : project.devgotchiHealth >= 50
      ? "warning"
      : "critical";

  return {
    project: project.name,
    branch: "main",
    workflow: "GraphQL",
    status: projectStatuses[project.status],
    health,
    vida: project.devgotchiHealth,
    message: moodMessages[project.devgotchiMood],
    timestamp: project.updatedAt,
  };
}

function App() {
  const { data, error, loading, refetch } = useQuery<
    ProjectsQueryData,
    ProjectsQueryVariables
  >(GET_PROJECTS, {
    variables: { status: "active", limit: 1, offset: 0 },
  });

  if (loading) {
    return (
      <main className="app-shell">
        <p className="query-status" role="status">
          Cargando DevGotchi…
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="query-status query-status--error" role="alert">
          <h1>No se pudo cargar DevGotchi</h1>
          <p>{error.message}</p>
          <button type="button" onClick={() => void refetch()}>
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  if (!data?.projects.length) {
    return (
      <main className="app-shell">
        <section className="query-status" role="status">
          <h1>Aún no hay proyectos activos</h1>
          <p>Crea un proyecto para adoptar tu primer DevGotchi.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <DevGotchiCard data={toCardData(data.projects[0])} />
    </main>
  );
}

export default App;
