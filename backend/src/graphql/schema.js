const typeDefs = `
  
  type User {
    id: ID!
    uuid: String!
    email: String!
    username: String!
    fullName: String
    avatarUrl: String
    status: String
    projects: [Project!]!
    createdAt: String!
    updatedAt: String!
  }

  type Project {
    id: ID!
    uuid: String!
    userId: ID!
    user: User!
    name: String!
    description: String
    repositoryUrl: String
    status: String
    devgotchiHealth: Int!
    devgotchiMood: String!
    lastCommitDate: String
    activities: [Activity!]!
    healthHistory: [HealthRecord!]!
    webhooks: [Webhook!]!
    createdAt: String!
    updatedAt: String!
  }

  type Devgotchi {
    id: ID!
    nombre: String!
    vida_actual: Int!
    salud: SaludRepositorio!
    repository_url: String
    uuid: String!
    userId: ID!
    name: String!
    repositoryUrl: String
    devgotchiHealth: Int!
    devgotchiMood: String!
    status: String
    diagnostico: DiagnosticoRepositorio
  }

  type VerificacionRepositorio {
    key: String!
    label: String!
    status: String!
    detail: String!
    impact: Int!
  }

  type DiagnosticoRepositorio {
    score: Int!
    summary: String!
    analyzedAt: String!
    checks: [VerificacionRepositorio!]!
    recommendations: [String!]!
  }

  type SaludRepositorio {
    puntosVida: Int!
    ultimoCommit: String
    estado: String!
  }

  type Activity {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    activityType: String!
    description: String
    metadata: String
    healthImpact: Int
    moodImpact: String
    createdAt: String!
  }

  type HealthRecord {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    healthValue: Int!
    mood: String!
    createdAt: String!
  }

  type Webhook {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    webhookUrl: String!
    eventType: String!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    devgotchi: Devgotchi

    users: [User!]!

    user(id: ID!): User

    projects: [Project!]!

    project(id: ID!): Project

    userProjects(userId: ID!): [Project!]!

    projectActivities(projectId: ID!): [Activity!]!

    projectHealthHistory(projectId: ID!): [HealthRecord!]!

    projectWebhooks(projectId: ID!): [Webhook!]!
  }

  type Mutation {
    conectarRepositorio(repositoryUrl: String!): Devgotchi

    renombrarDevgotchi(projectId: ID!, nombre: String!): Devgotchi

    analizarRepositorio(projectId: ID!): Devgotchi

    createUser(
      email: String!
      username: String!
      password: String!
      fullName: String
    ): User

    updateUser(
      id: ID!
      email: String
      username: String
      fullName: String
      avatarUrl: String
    ): User

    createProject(
      userId: ID!
      name: String!
      description: String
      repositoryUrl: String
    ): Project

    updateProject(
      id: ID!
      name: String
      description: String
      repositoryUrl: String
      status: String
    ): Project

    updateDevgotchiHealth(
      projectId: ID!
      healthValue: Int!
      mood: String!
    ): Project

    cuidarDevgotchi(projectId: ID): Devgotchi

    disminuirVida(projectId: ID!): Project

    createActivity(
      projectId: ID!
      activityType: String!
      description: String
      metadata: String
      healthImpact: Int
      moodImpact: String
    ): Activity

    createWebhook(
      projectId: ID!
      webhookUrl: String!
      eventType: String!
    ): Webhook

    toggleWebhook(
      id: ID!
      isActive: Boolean!
    ): Webhook

    deleteProject(id: ID!): Boolean

    deleteUser(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
