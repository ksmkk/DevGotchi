import { gql } from "@apollo/client";

export const GET_PROJECTS = gql`
  query GetProjects($status: String, $limit: Int!, $offset: Int!) {
    projects(status: $status, limit: $limit, offset: $offset) {
      id
      uuid
      name
      description
      repositoryUrl
      status
      devgotchiHealth
      devgotchiMood
      lastCommitDate
      createdAt
      updatedAt
    }
  }
`;
