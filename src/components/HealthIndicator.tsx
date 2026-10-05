import type { HealthStatus } from "../types/devgotchi";

type HealthIndicatorProps = {
  health: HealthStatus;
  activity?: "idle" | "feeding" | "playing" | "caring" | "petting" | "moving" | "entering";
  species?: PetSpecies;
};

export type PetSpecies = "dog" | "cat" | "platypus";

const healthDetails: Record<
  HealthStatus,
  { label: string; description: string }
> = {
  healthy: {
    label: "Saludable",
    description: "DevGotchi está feliz y saludable",
  },
  warning: {
    label: "Bajo",
    description: "DevGotchi está atento y necesita supervisión",
  },
  critical: {
    label: "Crítico",
    description: "DevGotchi está enfermo y necesita ayuda",
  },
  unknown: {
    label: "Desconocido",
    description: "No se conoce el estado de DevGotchi",
  },
};

function Dog() {
  return (
    <svg className="pet-character pet-svg dog" viewBox="0 0 220 220" aria-hidden="true">
      <defs>
        <linearGradient id="dog-fur" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd091" /><stop offset="1" stopColor="#e4964f" />
        </linearGradient>
        <linearGradient id="dog-ear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8734b" /><stop offset="1" stopColor="#875034" />
        </linearGradient>
      </defs>
      <ellipse className="pet-svg__shadow" cx="112" cy="196" rx="67" ry="12" />
      <g className="pet-svg__tail">
        <path d="M172 146c30-25 46-6 30 11-9 9-22 7-30 2" fill="none" stroke="#b96d3c" strokeWidth="18" strokeLinecap="round" />
        <path d="M190 143c8-3 12 1 8 7" fill="none" stroke="#eda75f" strokeWidth="5" strokeLinecap="round" opacity=".7" />
      </g>
      <g className="pet-svg__body">
        <path d="M62 126c5-28 25-43 50-43s46 15 51 43l7 49c2 17-10 27-26 27H80c-16 0-28-10-25-27z" fill="url(#dog-fur)" stroke="#65402d" strokeWidth="4" />
        <ellipse cx="112" cy="151" rx="34" ry="38" fill="#fbd5a2" opacity=".72" />
        <path d="M81 165v27M143 165v27" stroke="#65402d" strokeWidth="22" strokeLinecap="round" />
        <path d="M81 164v26M143 164v26" stroke="#f5b86f" strokeWidth="15" strokeLinecap="round" />
        <path d="M72 196h21M132 196h22" stroke="#fff0d5" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g className="pet-svg__head">
        <path className="pet-svg__ear pet-svg__ear--left" d="M66 50C35 37 23 58 31 91c5 20 22 28 35 14 11-12 9-42 0-55z" fill="url(#dog-ear)" stroke="#65402d" strokeWidth="4" />
        <path className="pet-svg__ear pet-svg__ear--right" d="M158 50c31-13 43 8 35 41-5 20-22 28-35 14-11-12-9-42 0-55z" fill="url(#dog-ear)" stroke="#65402d" strokeWidth="4" />
        <path d="M54 77c0-34 23-57 58-57s58 23 58 57-20 59-58 59S54 111 54 77z" fill="url(#dog-fur)" stroke="#65402d" strokeWidth="4" />
        <path d="M124 23c27 4 42 23 43 45-22 7-41-2-47-20-3-9-1-18 4-25z" fill="#a75f3d" opacity=".9" />
        <path d="M72 45c8-12 19-18 31-20" fill="none" stroke="#ffe1b1" strokeWidth="7" strokeLinecap="round" opacity=".72" />
        <g className="pet-svg__eyes">
          <ellipse cx="87" cy="77" rx="9" ry="12" fill="#3b2921" /><ellipse cx="137" cy="77" rx="9" ry="12" fill="#3b2921" />
          <circle cx="84" cy="73" r="3" fill="white" /><circle cx="134" cy="73" r="3" fill="white" />
        </g>
        <ellipse cx="112" cy="104" rx="30" ry="23" fill="#fff1d7" />
        <path d="M101 95c1-8 21-8 22 0 0 7-6 10-11 10s-11-3-11-10z" fill="#3c2922" />
        <path d="M112 105v5m0 0c-9 0-11 8-16 7m16-7c9 0 11 8 16 7" fill="none" stroke="#684234" strokeWidth="3" strokeLinecap="round" />
        <path className="pet-svg__tongue" d="M104 116h16v8c0 9-16 9-16 0z" fill="#ed8290" stroke="#8f4853" strokeWidth="2" />
        <path d="M70 119c22 12 62 12 84 0" fill="none" stroke="#2f6f63" strokeWidth="10" strokeLinecap="round" />
        <circle cx="112" cy="130" r="13" fill="#ffd75e" stroke="#65402d" strokeWidth="3" />
        <text x="112" y="135" textAnchor="middle" fill="#a84055" fontSize="12" fontWeight="900">♥</text>
      </g>
    </svg>
  );
}

function Cat() {
  return (
    <svg className="pet-character pet-svg cat" viewBox="0 0 220 220" aria-hidden="true">
      <defs><linearGradient id="cat-fur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d4d0df" /><stop offset="1" stopColor="#8c879d" /></linearGradient></defs>
      <ellipse className="pet-svg__shadow" cx="111" cy="196" rx="65" ry="12" />
      <g className="pet-svg__tail"><path d="M166 169c34 2 43-31 27-43-11-9-25-1-20 12 3 8 12 7 18 3" fill="none" stroke="#777186" strokeWidth="17" strokeLinecap="round" /><path d="M190 128c-5-3-12-1-14 5" fill="none" stroke="#c5c0d0" strokeWidth="5" strokeLinecap="round" /></g>
      <g className="pet-svg__body">
        <path d="M58 132c3-31 24-48 53-48s50 17 54 48l6 43c2 17-10 27-26 27H78c-16 0-27-10-25-27z" fill="url(#cat-fur)" stroke="#4e4655" strokeWidth="4" />
        <path d="M112 102c-18 17-25 47-17 78" fill="none" stroke="#f0edf4" strokeWidth="23" strokeLinecap="round" opacity=".64" />
        <path d="M80 166v26M143 166v26" stroke="#4e4655" strokeWidth="22" strokeLinecap="round" /><path d="M80 166v25M143 166v25" stroke="#bcb8c9" strokeWidth="15" strokeLinecap="round" />
        <path d="M70 196h21M133 196h21" stroke="#ebe8ef" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g className="pet-svg__head">
        <path className="pet-svg__ear pet-svg__ear--left" d="M57 59L49 19l38 24z" fill="#aaa5b8" stroke="#4e4655" strokeWidth="4" strokeLinejoin="round" /><path d="M59 49l-4-20 20 13z" fill="#e8a5ad" />
        <path className="pet-svg__ear pet-svg__ear--right" d="M163 59l8-40-38 24z" fill="#aaa5b8" stroke="#4e4655" strokeWidth="4" strokeLinejoin="round" /><path d="M161 49l4-20-20 13z" fill="#e8a5ad" />
        <path d="M53 78c0-34 24-56 59-56s59 22 59 56-21 58-59 58-59-24-59-58z" fill="url(#cat-fur)" stroke="#4e4655" strokeWidth="4" />
        <path d="M102 24l3 26m15-26-3 26M82 31l11 22m49-22-11 22" stroke="#756f82" strokeWidth="6" strokeLinecap="round" />
        <path d="M70 49c8-11 18-17 29-19" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" opacity=".42" />
        <g className="pet-svg__eyes"><path d="M76 75c6-11 20-11 26 0-5 13-21 13-26 0zM122 75c6-11 20-11 26 0-5 13-21 13-26 0z" fill="#d9d35e" stroke="#4e4655" strokeWidth="3" /><path d="M89 68v15m46-15v15" stroke="#242329" strokeWidth="4" strokeLinecap="round" /><circle cx="85" cy="72" r="2" fill="white" /><circle cx="131" cy="72" r="2" fill="white" /></g>
        <ellipse cx="112" cy="104" rx="27" ry="20" fill="#f1eef3" /><path d="M105 94c2-6 13-6 15 0-1 6-5 8-8 8s-7-2-7-8z" fill="#bc6e7c" />
        <path d="M112 102v6m0 0c-7 0-9 6-13 6m13-6c7 0 9 6 13 6" fill="none" stroke="#5a4651" strokeWidth="2.5" strokeLinecap="round" />
        <g className="pet-svg__whiskers" fill="none" stroke="#5c535f" strokeWidth="2" strokeLinecap="round"><path d="M91 103L48 95m43 15-45 7m87-14 43-8m-43 15 45 7" /></g>
        <path d="M72 119c23 11 57 11 80 0" fill="none" stroke="#c95f79" strokeWidth="9" strokeLinecap="round" /><circle cx="112" cy="129" r="12" fill="#f6d45e" stroke="#4e4655" strokeWidth="3" /><text x="112" y="134" textAnchor="middle" fill="#a84055" fontSize="12" fontWeight="900">♥</text>
      </g>
    </svg>
  );
}

function Platypus() {
  return (
    <svg className="pet-character pet-svg platypus" viewBox="0 0 220 220" aria-hidden="true">
      <defs><linearGradient id="plat-fur" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8bd2c6" /><stop offset="1" stopColor="#42968e" /></linearGradient><pattern id="tail-grid" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(22)"><rect width="10" height="10" fill="#a77a4d" /><path d="M0 0v10" stroke="#795637" strokeWidth="2" /></pattern></defs>
      <ellipse className="pet-svg__shadow" cx="116" cy="196" rx="70" ry="12" />
      <g className="pet-svg__tail"><path d="M61 125c-31 0-48 30-38 63 6 20 27 22 44 4 18-20 23-51 10-62-4-4-10-5-16-5z" fill="url(#tail-grid)" stroke="#55402e" strokeWidth="4" /><path d="M36 143c10-8 22-11 34-9m-43 29c13-8 27-11 41-9m-38 29c10-6 21-8 31-7" fill="none" stroke="#cda577" strokeWidth="3" opacity=".7" /></g>
      <g className="pet-svg__body"><path d="M59 126c4-29 25-44 55-44 29 0 50 15 55 44l7 49c2 17-11 27-28 27H80c-17 0-29-10-27-27z" fill="url(#plat-fur)" stroke="#315b58" strokeWidth="4" /><ellipse cx="116" cy="154" rx="36" ry="39" fill="#aee1d7" opacity=".55" /><path d="M79 188c-9 4-13 14-5 17 12 4 28-2 29-10 1-8-14-11-24-7zm71 0c9 4 13 14 5 17-12 4-28-2-29-10-1-8 14-11 24-7z" fill="#e7b55d" stroke="#654c2e" strokeWidth="4" /></g>
      <g className="pet-svg__head"><path d="M54 76c0-33 25-55 61-55s61 22 61 55-22 57-61 57-61-24-61-57z" fill="url(#plat-fur)" stroke="#315b58" strokeWidth="4" /><path d="M72 44c10-11 21-16 34-17" fill="none" stroke="#caf2e9" strokeWidth="7" strokeLinecap="round" opacity=".62" />
        <g className="pet-svg__eyes"><ellipse cx="88" cy="67" rx="9" ry="12" fill="#2d3734" /><ellipse cx="142" cy="67" rx="9" ry="12" fill="#2d3734" /><circle cx="85" cy="63" r="3" fill="white" /><circle cx="139" cy="63" r="3" fill="white" /></g>
        <path d="M72 88c5-19 25-25 43-17 18-8 38-2 43 17 6 23-17 34-43 27-26 7-49-4-43-27z" fill="#efbd65" stroke="#654c2e" strokeWidth="4" /><path d="M77 95c19 7 57 7 76 0" fill="none" stroke="#b57b38" strokeWidth="3" opacity=".7" /><ellipse cx="96" cy="86" rx="3.5" ry="2.5" fill="#76552f" /><ellipse cx="134" cy="86" rx="3.5" ry="2.5" fill="#76552f" />
        <path d="M72 119c23 12 63 12 86 0" fill="none" stroke="#425eaa" strokeWidth="10" strokeLinecap="round" /><path d="M153 120l20 25-18 3-9-25z" fill="#526fbd" stroke="#304274" strokeWidth="3" /><circle cx="115" cy="130" r="13" fill="#8fdbe1" stroke="#315b58" strokeWidth="3" /><text x="115" y="135" textAnchor="middle" fill="#a84055" fontSize="12" fontWeight="900">♥</text>
      </g>
    </svg>
  );
}

export function HealthIndicator({
  health,
  activity = "idle",
  species = "dog",
}: HealthIndicatorProps) {
  const details = healthDetails[health];

  return (
    <div
      className={`health-indicator health-indicator--${health} health-indicator--${activity} health-indicator--${species}`}
      role="img"
      aria-label={details.description}
    >
      <div className="pet-effects" aria-hidden="true">
        <span className="pet-effect pet-effect--one">♥</span>
        <span className="pet-effect pet-effect--two">✦</span>
        <span className="pet-effect pet-effect--three">♥</span>
      </div>

      {species === "dog" ? <Dog /> : null}
      {species === "cat" ? <Cat /> : null}
      {species === "platypus" ? <Platypus /> : null}

      <div className="pet-prop pet-prop--bowl" aria-hidden="true">
        <span className="pet-prop__food" />
      </div>
      <div className="pet-prop pet-prop--ball" aria-hidden="true">
        <span />
      </div>
      <div className="pet-prop pet-prop--yarn" aria-hidden="true">
        <span />
      </div>
      <svg className="pet-prop pet-prop--splash" viewBox="0 0 120 72" aria-hidden="true">
        <ellipse className="water-ripple water-ripple--outer" cx="60" cy="57" rx="46" ry="10" />
        <ellipse className="water-ripple water-ripple--inner" cx="60" cy="57" rx="27" ry="6" />
        <path className="water-crest" d="M21 56c12-5 17-19 25-18 8 2 7 11 14 11 8 0 8-17 17-17 9 1 10 16 21 23-16-4-59-3-77 1z" />
        <path className="water-highlight" d="M31 53c9-4 12-11 16-11m28-5c4 2 6 9 11 13" />
        <path className="water-drop water-drop--left" d="M35 27c-7 8-4 14 1 14 6 0 8-7-1-14z" />
        <path className="water-drop water-drop--center" d="M62 12c-8 10-5 17 1 17 7 0 9-8-1-17z" />
        <path className="water-drop water-drop--right" d="M91 23c-7 8-4 14 1 14 6 0 8-7-1-14z" />
        <circle className="water-speck water-speck--left" cx="20" cy="35" r="3" />
        <circle className="water-speck water-speck--right" cx="105" cy="39" r="3.5" />
      </svg>
      <div className="pet-scan" aria-hidden="true"><span /></div>
      <span className="health-indicator__label">{details.label}</span>
    </div>
  );
}
