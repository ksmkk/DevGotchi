const { gql } = require('apollo-server-express');

/**
 * SCHEMA DE GRAPHQL - DevGotchi
 * 
 * Este archivo define la ESTRUCTURA de los datos disponibles en GraphQL.
 * Piensa en esto como un "contrato" que dice:
 * - Qué tipos de datos existen (User, Project, etc)
 * - Qué campos tiene cada tipo
 * - Qué operaciones puedo hacer (queries y mutations)
 */

const typeDefs = gql`
  # =====================
  # TIPOS (Types)
  # =====================
  
  """
  Tipo User: Representa un usuario del sistema
  """
  type User {
    id: ID!                    # ID único, obligatorio
    uuid: String!              # UUID generado por la BD
    email: String!
    username: String!
    fullName: String
    avatarUrl: String
    status: String             # active, inactive, banned
    projects: [Project!]!      # Lista de proyectos del usuario
    createdAt: String!
    updatedAt: String!
  }

  """
  Tipo Project: Representa un proyecto DevGotchi
  """
  type Project {
    id: ID!
    uuid: String!
    userId: ID!
    user: User!                # Relación: quién es el propietario
    name: String!
    description: String
    repositoryUrl: String
    status: String             # active, archived, deleted
    devgotchiHealth: Int!      # 0-100
    devgotchiMood: String!     # happy, sad, neutral, angry
    lastCommitDate: String
    activities: [Activity!]!   # Actividades del proyecto
    healthHistory: [HealthRecord!]!  # Histórico de salud
    webhooks: [Webhook!]!      # Webhooks del proyecto
    createdAt: String!
    updatedAt: String!
  }

  """
  Tipo Activity: Representa una actividad/evento en el proyecto
  (commits, PRs, issues, etc)
  """
  type Activity {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    activityType: String!     # commit, pr_opened, pr_closed, issue
    description: String
    metadata: String          # JSON como string (alternativa: usar Scalar)
    healthImpact: Int         # -10 a 10
    moodImpact: String
    createdAt: String!
  }

  """
  Tipo HealthRecord: Registro histórico de salud del DevGotchi
  """
  type HealthRecord {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    healthValue: Int!
    mood: String!
    createdAt: String!
  }

  """
  Tipo Webhook: Configuración de webhooks para un proyecto
  """
  type Webhook {
    id: ID!
    uuid: String!
    projectId: ID!
    project: Project!
    webhookUrl: String!
    eventType: String!        # push, pull_request, issue
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  # =====================
  # QUERIES (Lectura de datos)
  # =====================
  
  type Query {
    """
    Obtener todos los usuarios del sistema
    """
    users: [User!]!

    """
    Obtener un usuario específico por ID
    """
    user(id: ID!): User

    """
    Obtener todos los proyectos
    """
    projects: [Project!]!

    """
    Obtener un proyecto específico por ID
    """
    project(id: ID!): Project

    """
    Obtener proyectos de un usuario específico
    """
    userProjects(userId: ID!): [Project!]!

    """
    Obtener actividades de un proyecto
    """
    projectActivities(projectId: ID!): [Activity!]!

    """
    Obtener historial de salud de un proyecto
    """
    projectHealthHistory(projectId: ID!): [HealthRecord!]!

    """
    Obtener webhooks de un proyecto
    """
    projectWebhooks(projectId: ID!): [Webhook!]!
  }

  # =====================
  # MUTATIONS (Modificación de datos)
  # =====================
  
  type Mutation {
    """
    Crear un nuevo usuario
    """
    createUser(
      email: String!
      username: String!
      password: String!
      fullName: String
    ): User

    """
    Actualizar un usuario
    """
    updateUser(
      id: ID!
      email: String
      username: String
      fullName: String
      avatarUrl: String
    ): User

    """
    Crear un nuevo proyecto
    """
    createProject(
      userId: ID!
      name: String!
      description: String
      repositoryUrl: String
    ): Project

    """
    Actualizar un proyecto
    """
    updateProject(
      id: ID!
      name: String
      description: String
      repositoryUrl: String
      status: String
    ): Project

    """
    Actualizar la salud del DevGotchi
    """
    updateDevgotchiHealth(
      projectId: ID!
      healthValue: Int!
      mood: String!
    ): Project

    """
    Cuida al DevGotchi y recupera 10 puntos de salud
    """
    cuidarDevgotchi(projectId: ID!): Project

    """
    Reduce 10 puntos de vida del DevGotchi
    """
    disminuirVida(projectId: ID!): Project

    """
    Registrar una actividad en un proyecto
    """
    createActivity(
      projectId: ID!
      activityType: String!
      description: String
      metadata: String
      healthImpact: Int
      moodImpact: String
    ): Activity

    """
    Crear un webhook para un proyecto
    """
    createWebhook(
      projectId: ID!
      webhookUrl: String!
      eventType: String!
    ): Webhook

    """
    Activar/desactivar un webhook
    """
    toggleWebhook(
      id: ID!
      isActive: Boolean!
    ): Webhook

    """
    Eliminar un proyecto
    """
    deleteProject(id: ID!): Boolean

    """
    Eliminar un usuario
    """
    deleteUser(id: ID!): Boolean
  }
`;

module.exports = { typeDefs };
