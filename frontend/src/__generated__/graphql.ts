/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Activity = {
  __typename?: 'Activity';
  activityType: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  healthImpact?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['String']['output']>;
  moodImpact?: Maybe<Scalars['String']['output']>;
  project: Project;
  projectId: Scalars['ID']['output'];
  uuid: Scalars['String']['output'];
};

export type Devgotchi = {
  __typename?: 'Devgotchi';
  devgotchiHealth: Scalars['Int']['output'];
  devgotchiMood: Scalars['String']['output'];
  diagnostico?: Maybe<DiagnosticoRepositorio>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  nombre: Scalars['String']['output'];
  repositoryUrl?: Maybe<Scalars['String']['output']>;
  repository_url?: Maybe<Scalars['String']['output']>;
  salud: SaludRepositorio;
  status?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  uuid: Scalars['String']['output'];
  vida_actual: Scalars['Int']['output'];
};

export type DiagnosticoRepositorio = {
  __typename?: 'DiagnosticoRepositorio';
  analyzedAt: Scalars['String']['output'];
  checks: Array<VerificacionRepositorio>;
  recommendations: Array<Scalars['String']['output']>;
  score: Scalars['Int']['output'];
  summary: Scalars['String']['output'];
};

export type HealthRecord = {
  __typename?: 'HealthRecord';
  createdAt: Scalars['String']['output'];
  healthValue: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  mood: Scalars['String']['output'];
  project: Project;
  projectId: Scalars['ID']['output'];
  uuid: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  analizarRepositorio?: Maybe<Devgotchi>;
  conectarRepositorio?: Maybe<Devgotchi>;
  createActivity?: Maybe<Activity>;
  createProject?: Maybe<Project>;
  createUser?: Maybe<User>;
  createWebhook?: Maybe<Webhook>;
  cuidarDevgotchi?: Maybe<Devgotchi>;
  deleteProject?: Maybe<Scalars['Boolean']['output']>;
  deleteUser?: Maybe<Scalars['Boolean']['output']>;
  disminuirVida?: Maybe<Project>;
  renombrarDevgotchi?: Maybe<Devgotchi>;
  toggleWebhook?: Maybe<Webhook>;
  updateDevgotchiHealth?: Maybe<Project>;
  updateProject?: Maybe<Project>;
  updateUser?: Maybe<User>;
};


export type MutationAnalizarRepositorioArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationConectarRepositorioArgs = {
  repositoryUrl: Scalars['String']['input'];
};


export type MutationCreateActivityArgs = {
  activityType: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  healthImpact?: InputMaybe<Scalars['Int']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
  moodImpact?: InputMaybe<Scalars['String']['input']>;
  projectId: Scalars['ID']['input'];
};


export type MutationCreateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  repositoryUrl?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};


export type MutationCreateUserArgs = {
  email: Scalars['String']['input'];
  fullName?: InputMaybe<Scalars['String']['input']>;
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationCreateWebhookArgs = {
  eventType: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
  webhookUrl: Scalars['String']['input'];
};


export type MutationCuidarDevgotchiArgs = {
  projectId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationDeleteProjectArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisminuirVidaArgs = {
  projectId: Scalars['ID']['input'];
};


export type MutationRenombrarDevgotchiArgs = {
  nombre: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationToggleWebhookArgs = {
  id: Scalars['ID']['input'];
  isActive: Scalars['Boolean']['input'];
};


export type MutationUpdateDevgotchiHealthArgs = {
  healthValue: Scalars['Int']['input'];
  mood: Scalars['String']['input'];
  projectId: Scalars['ID']['input'];
};


export type MutationUpdateProjectArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  repositoryUrl?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateUserArgs = {
  avatarUrl?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  fullName?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
};

export type Project = {
  __typename?: 'Project';
  activities: Array<Activity>;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  devgotchiHealth: Scalars['Int']['output'];
  devgotchiMood: Scalars['String']['output'];
  healthHistory: Array<HealthRecord>;
  id: Scalars['ID']['output'];
  lastCommitDate?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  repositoryUrl?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  user: User;
  userId: Scalars['ID']['output'];
  uuid: Scalars['String']['output'];
  webhooks: Array<Webhook>;
};

export type Query = {
  __typename?: 'Query';
  devgotchi?: Maybe<Devgotchi>;
  project?: Maybe<Project>;
  projectActivities: Array<Activity>;
  projectHealthHistory: Array<HealthRecord>;
  projectWebhooks: Array<Webhook>;
  projects: Array<Project>;
  user?: Maybe<User>;
  userProjects: Array<Project>;
  users: Array<User>;
};


export type QueryProjectArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProjectActivitiesArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectHealthHistoryArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryProjectWebhooksArgs = {
  projectId: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserProjectsArgs = {
  userId: Scalars['ID']['input'];
};

export type SaludRepositorio = {
  __typename?: 'SaludRepositorio';
  estado: Scalars['String']['output'];
  puntosVida: Scalars['Int']['output'];
  ultimoCommit?: Maybe<Scalars['String']['output']>;
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  projects: Array<Project>;
  status?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  username: Scalars['String']['output'];
  uuid: Scalars['String']['output'];
};

export type VerificacionRepositorio = {
  __typename?: 'VerificacionRepositorio';
  detail: Scalars['String']['output'];
  impact: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  status: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type Webhook = {
  __typename?: 'Webhook';
  createdAt: Scalars['String']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  project: Project;
  projectId: Scalars['ID']['output'];
  updatedAt: Scalars['String']['output'];
  uuid: Scalars['String']['output'];
  webhookUrl: Scalars['String']['output'];
};

export type DevGotchiFieldsFragment = { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null };

export type GetDevGotchiQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDevGotchiQuery = { devgotchi: { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null } | null };

export type CareForDevGotchiMutationVariables = Exact<{ [key: string]: never; }>;


export type CareForDevGotchiMutation = { cuidarDevgotchi: { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null } | null };

export type ConnectRepositoryMutationVariables = Exact<{
  repositoryUrl: string;
}>;


export type ConnectRepositoryMutation = { conectarRepositorio: { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null } | null };

export type RenameDevGotchiMutationVariables = Exact<{
  projectId: string | number;
  nombre: string;
}>;


export type RenameDevGotchiMutation = { renombrarDevgotchi: { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null } | null };

export type AnalyzeRepositoryMutationVariables = Exact<{
  projectId: string | number;
}>;


export type AnalyzeRepositoryMutation = { analizarRepositorio: { id: string, nombre: string, vida_actual: number, repository_url: string | null, salud: { puntosVida: number, ultimoCommit: string | null, estado: string }, diagnostico: { score: number, summary: string, analyzedAt: string, recommendations: Array<string>, checks: Array<{ key: string, label: string, status: string, detail: string, impact: number, source: string }> } | null } | null };
