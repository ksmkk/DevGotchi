import type { DevGotchiApiData } from "../types/devgotchi";

type Diagnosis = NonNullable<DevGotchiApiData["diagnostico"]>;

type RepositoryReportProps = {
  diagnosis?: Diagnosis | null;
  error?: string;
  loading: boolean;
  onRefresh: () => Promise<void> | void;
};

const statusLabel = {
  healthy: "Bien",
  warning: "Atención",
  critical: "Crítico",
  unknown: "No verificable",
} as const;

export function RepositoryReport({ diagnosis, error, loading, onRefresh }: RepositoryReportProps) {
  return (
    <section className="panel repository-report" aria-labelledby="repository-report-title">
      <div className="report-heading">
        <div>
          <p className="panel__eyebrow">Informe técnico</p>
          <h2 id="repository-report-title">Qué mejorar en tu repositorio</h2>
        </div>
        <button type="button" onClick={() => void onRefresh()} disabled={loading}>
          {loading ? "Analizando…" : "Actualizar análisis"}
        </button>
      </div>

      {diagnosis ? (
        <>
          <div className="report-score">
            <strong>{diagnosis.score}/100</strong>
            <span>{diagnosis.summary}</span>
          </div>
          <ul className="report-checks">
            {diagnosis.checks.map((item) => (
              <li key={item.key} className={`report-check report-check--${item.status}`}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{statusLabel[item.status as keyof typeof statusLabel] ?? item.status}</span>
                </div>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
          <div className="report-recommendations">
            <h3>Próximos pasos</h3>
            {diagnosis.recommendations.length > 0 ? (
              <ol>
                {diagnosis.recommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ol>
            ) : <p>No hay mejoras urgentes en las señales verificables.</p>}
          </div>
          <small>Último análisis: {new Intl.DateTimeFormat("es-CL", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(diagnosis.analyzedAt))}</small>
        </>
      ) : (
        <p className="report-empty">
          Aún no hay un análisis disponible. Actualízalo para revisar tests, CI/CD y seguridad.
        </p>
      )}
      {error ? <p className="action-error" role="alert">{error}</p> : null}
    </section>
  );
}
