import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { DevGotchiApiData, HealthStatus } from "../types/devgotchi";
import { HealthIndicator, type PetSpecies } from "./HealthIndicator";

type DevGotchiViewProps = {
  devgotchi: DevGotchiApiData;
  careError?: string;
  careLoading: boolean;
  onCare: () => Promise<void> | void;
  onRename: (name: string) => Promise<void> | void;
  renameError?: string;
  renameLoading: boolean;
};

type PetActivity = "idle" | "feeding" | "playing" | "caring" | "petting" | "moving" | "entering";

type DragState = {
  distance: number;
  originX: number;
  pointerId: number;
  previousX: number;
  previousY: number;
  startX: number;
  stroked: boolean;
};

const speciesDetails: Record<PetSpecies, { icon: string; label: string; greeting: string }> = {
  dog: { icon: "🐶", label: "Perro", greeting: "listo para acompañarte" },
  cat: { icon: "🐱", label: "Gato", greeting: "curioseando por aquí" },
  platypus: { icon: "🦆", label: "Ornitorrinco", greeting: "listo para explorar tus commits" },
};

const petSpeciesStorageKey = "devgotchi-pet-species";

const clampLife = (value: number) => Math.min(100, Math.max(0, value));

function getHealthStatus(life: number): HealthStatus {
  if (life > 80) return "healthy";
  if (life >= 50) return "warning";
  return "critical";
}

export function DevGotchiView({
  devgotchi,
  careError,
  careLoading,
  onCare,
  onRename,
  renameError,
  renameLoading,
}: DevGotchiViewProps) {
  const life = clampLife(devgotchi.vida_actual);
  const health = getHealthStatus(life);
  const [activity, setActivity] = useState<PetActivity>("idle");
  const [species, setSpecies] = useState<PetSpecies>(() => {
    const savedSpecies = window.localStorage.getItem(petSpeciesStorageKey);
    return savedSpecies === "cat" || savedSpecies === "platypus" ? savedSpecies : "dog";
  });
  const [interactionKey, setInteractionKey] = useState(0);
  const [petPosition, setPetPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragState = useRef<DragState | null>(null);
  const [interactionMessage, setInteractionMessage] = useState(
    `${devgotchi.nombre} te está esperando.`,
  );
  const [petName, setPetName] = useState(devgotchi.nombre);

  useEffect(() => () => {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(petSpeciesStorageKey, species);
  }, [species]);

  function interact(nextActivity: PetActivity, message: string, duration = 1800) {
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
    setActivity(nextActivity);
    setInteractionKey((key) => key + 1);
    setInteractionMessage(message);
    interactionTimer.current = setTimeout(() => {
      setActivity("idle");
      interactionTimer.current = null;
    }, duration);
  }

  async function care() {
    interact("caring", `Revisando la salud técnica de ${devgotchi.nombre}…`);
    try {
      await onCare();
      setInteractionMessage(`¡Listo! Revisé el código y ya sé cómo está todo.`);
    } catch {
      setInteractionMessage(`No pudimos analizar a ${devgotchi.nombre}. Inténtalo otra vez.`);
    }
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = petName.trim();
    if (!normalizedName || normalizedName === devgotchi.nombre) return;
    await onRename(normalizedName);
    setInteractionMessage(`¡Hola! Ahora me llamo ${normalizedName}.`);
  }

  function chooseSpecies(nextSpecies: PetSpecies) {
    setSpecies(nextSpecies);
    interact(
      "entering",
      `¡Hola! Soy ${devgotchi.nombre}, tu ${speciesDetails[nextSpecies].label.toLowerCase()} y estoy ${speciesDetails[nextSpecies].greeting}.`,
      1750,
    );
  }

  function startPetInteraction(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragState.current = {
      distance: 0,
      originX: petPosition,
      pointerId: event.pointerId,
      previousX: event.clientX,
      previousY: event.clientY,
      startX: event.clientX,
      stroked: false,
    };
    setIsDragging(true);
  }

  function movePetInteraction(event: PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const stepDistance = Math.hypot(
      event.clientX - drag.previousX,
      event.clientY - drag.previousY,
    );
    drag.distance += stepDistance;
    drag.previousX = event.clientX;
    drag.previousY = event.clientY;
    setPetPosition(Math.max(-54, Math.min(54, drag.originX + event.clientX - drag.startX)));

    if (drag.distance > 42 && !drag.stroked) {
      drag.stroked = true;
      interact("petting", `¡Mmm! A ${devgotchi.nombre} le encantan los cariños.`, 2200);
    }
  }

  function endPetInteraction(event: PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }

    if (drag.distance < 8) {
      interact("petting", `¡Qué cariño! ${devgotchi.nombre} confía un poquito más en ti.`, 1800);
    } else if (!drag.stroked) {
      interact("moving", `${devgotchi.nombre} se acomodó cerquita de ti.`, 1200);
    }
    dragState.current = null;
    setIsDragging(false);
  }

  function movePetToClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".pet-drag-shell, .pet-message")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    const nextPosition = Math.max(-54, Math.min(54, (relativeX / bounds.width - 0.5) * 118));
    setPetPosition(nextPosition);
    interact(
      "moving",
      `${devgotchi.nombre} fue ${nextPosition < 0 ? "hacia la izquierda" : "hacia la derecha"}.`,
      1200,
    );
  }

  return (
    <article className={`devgotchi-card devgotchi-card--${health}`}>
      <header className="devgotchi-card__header">
        <div>
          <p className="devgotchi-card__eyebrow">Tu mascota digital</p>
          <h2>{devgotchi.nombre}</h2>
          <form className="pet-name-form" onSubmit={(event) => void rename(event)}>
            <label htmlFor="pet-name">Nombre de la mascota</label>
            <div>
              <input
                id="pet-name"
                value={petName}
                maxLength={40}
                onChange={(event) => setPetName(event.target.value)}
              />
              <button type="submit" disabled={renameLoading || !petName.trim()}>
                {renameLoading ? "Guardando…" : "Cambiar"}
              </button>
            </div>
          </form>
        </div>
        <span className="health-chip">Nivel {life}</span>
      </header>

      <div className="pet-stage" aria-live="polite" onClick={movePetToClick}>
        <div className="pet-stage__sky" aria-hidden="true">
          <span className="pet-stage__cloud pet-stage__cloud--one" />
          <span className="pet-stage__cloud pet-stage__cloud--two" />
        </div>
        <div
          className={`pet-drag-shell${isDragging ? " pet-drag-shell--dragging" : ""}`}
          style={{ transform: `translateX(${petPosition}px)` }}
          onPointerDown={startPetInteraction}
          onPointerMove={movePetInteraction}
          onPointerUp={endPetInteraction}
          onPointerCancel={endPetInteraction}
          title="Haz clic para acariciar o arrastra para mover"
        >
          <HealthIndicator
            key={`${species}-${interactionKey}`}
            health={health}
            activity={activity}
            species={species}
          />
        </div>
        <span className="pet-stage__hint" aria-hidden="true">Arrastra · acaricia · explora</span>
        <div className="pet-message" role="status">
          <span className="pet-message__dot" aria-hidden="true" />
          <p>{interactionMessage}</p>
        </div>
      </div>

      <fieldset className="pet-picker">
        <legend>Elige a tu compañero</legend>
        <div className="pet-picker__options">
          {(Object.entries(speciesDetails) as [PetSpecies, typeof speciesDetails[PetSpecies]][])
            .map(([value, details]) => (
              <label
                key={value}
                className={`pet-picker__option${species === value ? " pet-picker__option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="pet-species"
                  value={value}
                  checked={species === value}
                  onChange={() => chooseSpecies(value)}
                />
                <span aria-hidden="true">{details.icon}</span>
                <strong>{details.label}</strong>
                <small>{species === value ? "Tu compañero" : "Elegir"}</small>
              </label>
            ))}
        </div>
      </fieldset>

      <section className="life" aria-labelledby="life-label">
        <div className="life__heading">
          <h3 id="life-label">Vida</h3>
          <strong>{life}/100</strong>
        </div>
        <progress
          className={`life__progress life__progress--${health}`}
          value={life}
          max="100"
          aria-label={`Vida de ${devgotchi.nombre}: ${life} de 100`}
        >
          {life}%
        </progress>
      </section>

      <section className="pet-controls" aria-labelledby="pet-controls-title">
        <div className="pet-controls__heading">
          <div>
            <p className="devgotchi-card__eyebrow">Momento de conectar</p>
            <h3 id="pet-controls-title">Cuida a tu compañero</h3>
          </div>
          <span>Elige una acción</span>
        </div>
        <div className="pet-controls__grid">
          <button
            type="button"
            className="pet-control pet-control--feed"
            onClick={() => interact("feeding", `¡Ñam! ${devgotchi.nombre} disfrutó su snack.`)}
            aria-pressed={activity === "feeding"}
          >
            <span className="pet-control__icon" aria-hidden="true">🍎</span>
            <strong>Alimentar</strong>
            <small>Recupera energía</small>
          </button>
          <button
            type="button"
            className="pet-control pet-control--play"
            onClick={() => interact("playing", `¡Qué divertido! ${devgotchi.nombre} está feliz.`)}
            aria-pressed={activity === "playing"}
          >
            <span className="pet-control__icon" aria-hidden="true">★</span>
            <strong>Jugar</strong>
            <small>Mejora su ánimo</small>
          </button>
          <button
            type="button"
            className="pet-control pet-control--care"
            onClick={() => void care()}
            disabled={careLoading}
            aria-pressed={activity === "caring"}
          >
            <span className="pet-control__icon" aria-hidden="true">♥</span>
            <strong>{careLoading ? "Analizando…" : "Revisar salud"}</strong>
            <small>Sincroniza con GitHub</small>
          </button>
        </div>
      </section>
      {careError ? <p className="action-error" role="alert">{careError}</p> : null}
      {renameError ? <p className="action-error" role="alert">{renameError}</p> : null}
    </article>
  );
}
