import { gql } from "@apollo/client";

const DEV_GOTCHI_FIELDS = gql`
  fragment DevGotchiFields on DevGotchi {
    id
    nombre
    vida_actual
    repository_url
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
    conectarRepositorio(repository_url: $repositoryUrl) {
      ...DevGotchiFields
    }
  }
`;
