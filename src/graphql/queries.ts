import { gql } from "@apollo/client";

const DEV_GOTCHI_FIELDS = gql`
  fragment DevGotchiFields on Devgotchi {
    id
    nombre
    vida_actual
    repository_url
    salud {
      puntosVida
      ultimoCommit
      estado
    }
    diagnostico {
      score
      summary
      analyzedAt
      checks {
        key
        label
        status
        detail
        impact
        source
      }
      recommendations
    }
  }
`;

export const GET_DEVGOTCHI = gql`
  ${DEV_GOTCHI_FIELDS}
  query GetDevGotchi {
    devgotchi {
      ...DevGotchiFields
    }
  }
`;

export const CARE_FOR_DEVGOTCHI = gql`
  ${DEV_GOTCHI_FIELDS}
  mutation CareForDevGotchi {
    cuidarDevgotchi {
      ...DevGotchiFields
    }
  }
`;

export const CONNECT_REPOSITORY = gql`
  ${DEV_GOTCHI_FIELDS}
  mutation ConnectRepository($repositoryUrl: String!) {
    conectarRepositorio(repositoryUrl: $repositoryUrl) {
      ...DevGotchiFields
    }
  }
`;

export const RENAME_DEVGOTCHI = gql`
  ${DEV_GOTCHI_FIELDS}
  mutation RenameDevGotchi($projectId: ID!, $nombre: String!) {
    renombrarDevgotchi(projectId: $projectId, nombre: $nombre) {
      ...DevGotchiFields
    }
  }
`;

export const ANALYZE_REPOSITORY = gql`
  ${DEV_GOTCHI_FIELDS}
  mutation AnalyzeRepository($projectId: ID!) {
    analizarRepositorio(projectId: $projectId) {
      ...DevGotchiFields
    }
  }
`;
