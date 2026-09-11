const { randomUUID } = require('crypto');

/**
 * RESOLVERS DE GRAPHQL - DevGotchi
 * 
 * Los resolvers son funciones que se ejecutan cuando GraphQL recibe una consulta.
 * Cada resolver corresponde a un campo en el schema.
 * 
 * Estructura de un resolver:
 * resolver(parent, args, context, info) {
 *   // parent: objeto padre (para campos anidados)
 *   // args: argumentos de la consulta
 *   // context: datos compartidos (BD, auth, etc)
 *   // info: información sobre la consulta
 * }
 */

const resolvers = {
  // =====================
  // QUERIES - Lectura de datos
  // =====================
  Query: {
    devgotchi: async (_, __, { db }) => {
      const result = await db.query('SELECT * FROM projects ORDER BY created_at ASC LIMIT 1');
      return result.rows.length === 0 ? null : formatProject(result.rows[0]);
    },

    /**
     * Query.users
     * Retorna todos los usuarios
     * Ejemplo: query { users { id username } }
     */
    users: async (_, __, { db }) => {
      try {
        const query = 'SELECT * FROM users ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows.map(formatUser);
      } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error('No se pudieron obtener los usuarios');
      }
    },

    /**
     * Query.user(id)
     * Retorna un usuario específico
     * Ejemplo: query { user(id: "1") { id username email } }
     */
    user: async (_, { id }, { db }) => {
      try {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) return null;
        return formatUser(result.rows[0]);
      } catch (error) {
        console.error('Error fetching user:', error);
        throw new Error('No se pudo obtener el usuario');
      }
    },

    /**
     * Query.projects
     * Retorna todos los proyectos
     * Ejemplo: query { projects { id name devgotchiHealth } }
     */
    projects: async (_, __, { db }) => {
      try {
        const query = 'SELECT * FROM projects ORDER BY created_at DESC';
        const result = await db.query(query);
        return result.rows.map(formatProject);
      } catch (error) {
        console.error('Error fetching projects:', error);
        throw new Error('No se pudieron obtener los proyectos');
      }
    },

    /**
     * Query.project(id)
     * Retorna un proyecto específico
     * Ejemplo: query { project(id: "1") { id name devgotchiHealth } }
     */
    project: async (_, { id }, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) return null;
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error fetching project:', error);
        throw new Error('No se pudo obtener el proyecto');
      }
    },

    /**
     * Query.userProjects(userId)
     * Retorna todos los proyectos de un usuario
     * Ejemplo: query { userProjects(userId: "1") { id name } }
     */
    userProjects: async (_, { userId }, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [userId]);
        return result.rows.map(formatProject);
      } catch (error) {
        console.error('Error fetching user projects:', error);
        throw new Error('No se pudieron obtener los proyectos del usuario');
      }
    },

    /**
     * Query.projectActivities(projectId)
     * Retorna todas las actividades de un proyecto
     * Ejemplo: query { projectActivities(projectId: "1") { id activityType } }
     */
    projectActivities: async (_, { projectId }, { db }) => {
      try {
        const query = 'SELECT * FROM activities WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [projectId]);
        return result.rows.map(formatActivity);
      } catch (error) {
        console.error('Error fetching activities:', error);
        throw new Error('No se pudieron obtener las actividades');
      }
    },

    /**
     * Query.projectHealthHistory(projectId)
     * Retorna el historial de salud de un proyecto
     * Ejemplo: query { projectHealthHistory(projectId: "1") { healthValue mood } }
     */
    projectHealthHistory: async (_, { projectId }, { db }) => {
      try {
        const query = 'SELECT * FROM health_history WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [projectId]);
        return result.rows.map(formatHealthRecord);
      } catch (error) {
        console.error('Error fetching health history:', error);
        throw new Error('No se pudo obtener el historial de salud');
      }
    },

    /**
     * Query.projectWebhooks(projectId)
     * Retorna todos los webhooks de un proyecto
     * Ejemplo: query { projectWebhooks(projectId: "1") { id webhookUrl } }
     */
    projectWebhooks: async (_, { projectId }, { db }) => {
      try {
        const query = 'SELECT * FROM webhooks WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [projectId]);
        return result.rows.map(formatWebhook);
      } catch (error) {
        console.error('Error fetching webhooks:', error);
        throw new Error('No se pudieron obtener los webhooks');
      }
    },
  },

  // =====================
  // MUTATIONS - Modificación de datos
  // =====================
  Mutation: {
    conectarRepositorio: async (_, { repositoryUrl }, { db }) => {
      const existing = await db.query(
        'SELECT * FROM projects WHERE repository_url = $1 LIMIT 1',
        [repositoryUrl],
      );

      if (existing.rows.length > 0) {
        return formatProject(existing.rows[0]);
      }

      const user = await db.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
      if (user.rows.length === 0) {
        throw new Error('No hay un usuario disponible para conectar el repositorio');
      }

      const name = repositoryUrl.split('/').filter(Boolean).pop() || 'repositorio';
      const result = await db.query(
        `INSERT INTO projects (uuid, user_id, name, repository_url, devgotchi_health, devgotchi_mood)
         VALUES ($1, $2, $3, $4, 100, 'neutral')
         RETURNING *`,
        [randomUUID(), user.rows[0].id, name.replace(/\.git$/, ''), repositoryUrl],
      );

      return formatProject(result.rows[0]);
    },

    /**
     * Mutation.createUser
     * Crea un nuevo usuario
     * Retorna el usuario creado
     */
    createUser: async (_, { email, username, password, fullName }, { db }) => {
      try {
        // En producción, deberías hashear la contraseña con bcrypt
        const query = `
          INSERT INTO users (uuid, email, username, password_hash, full_name)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const result = await db.query(query, [randomUUID(), email, username, password, fullName || null]);
        return formatUser(result.rows[0]);
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('No se pudo crear el usuario');
      }
    },

    /**
     * Mutation.updateUser
     * Actualiza los datos de un usuario
     */
    updateUser: async (_, { id, email, username, fullName, avatarUrl }, { db }) => {
      try {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (email !== undefined) {
          updates.push(`email = $${paramCount++}`);
          values.push(email);
        }
        if (username !== undefined) {
          updates.push(`username = $${paramCount++}`);
          values.push(username);
        }
        if (fullName !== undefined) {
          updates.push(`full_name = $${paramCount++}`);
          values.push(fullName);
        }
        if (avatarUrl !== undefined) {
          updates.push(`avatar_url = $${paramCount++}`);
          values.push(avatarUrl);
        }

        if (updates.length === 0) {
          throw new Error('No hay campos para actualizar');
        }

        values.push(id);
        const query = `
          UPDATE users
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        const result = await db.query(query, values);
        if (result.rows.length === 0) throw new Error('Usuario no encontrado');
        return formatUser(result.rows[0]);
      } catch (error) {
        console.error('Error updating user:', error);
        throw new Error('No se pudo actualizar el usuario');
      }
    },

    /**
     * Mutation.createProject
     * Crea un nuevo proyecto
     */
    createProject: async (_, { userId, name, description, repositoryUrl }, { db }) => {
      try {
        const query = `
          INSERT INTO projects (uuid, user_id, name, description, repository_url, devgotchi_health, devgotchi_mood)
          VALUES ($1, $2, $3, $4, $5, 100, 'neutral')
          RETURNING *
        `;
        const result = await db.query(query, [randomUUID(), userId, name, description || null, repositoryUrl || null]);
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error creating project:', error);
        throw new Error('No se pudo crear el proyecto');
      }
    },

    /**
     * Mutation.updateProject
     * Actualiza los datos de un proyecto
     */
    updateProject: async (_, { id, name, description, repositoryUrl, status }, { db }) => {
      try {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
          updates.push(`name = $${paramCount++}`);
          values.push(name);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramCount++}`);
          values.push(description);
        }
        if (repositoryUrl !== undefined) {
          updates.push(`repository_url = $${paramCount++}`);
          values.push(repositoryUrl);
        }
        if (status !== undefined) {
          updates.push(`status = $${paramCount++}`);
          values.push(status);
        }

        if (updates.length === 0) {
          throw new Error('No hay campos para actualizar');
        }

        values.push(id);
        const query = `
          UPDATE projects
          SET ${updates.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;
        const result = await db.query(query, values);
        if (result.rows.length === 0) throw new Error('Proyecto no encontrado');
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error updating project:', error);
        throw new Error('No se pudo actualizar el proyecto');
      }
    },

    /**
     * Mutation.updateDevgotchiHealth
     * Actualiza la salud y el mood del DevGotchi
     * Importante: También crea un registro en health_history
     */
    updateDevgotchiHealth: async (_, { projectId, healthValue, mood }, { db }) => {
      try {
        // Validar que la salud esté entre 0 y 100
        const clampedHealth = Math.max(0, Math.min(100, healthValue));

        // Actualizar el proyecto
        const updateProjectQuery = `
          UPDATE projects
          SET devgotchi_health = $1, devgotchi_mood = $2
          WHERE id = $3
          RETURNING *
        `;
        const projectResult = await db.query(updateProjectQuery, [clampedHealth, mood, projectId]);
        if (projectResult.rows.length === 0) throw new Error('Proyecto no encontrado');

        // Registrar en el historial
        const insertHistoryQuery = `
          INSERT INTO health_history (project_id, health_value, mood)
          VALUES ($1, $2, $3)
        `;
        await db.query(insertHistoryQuery, [projectId, clampedHealth, mood]);

        return formatProject(projectResult.rows[0]);
      } catch (error) {
        console.error('Error updating devgotchi health:', error);
        throw new Error('No se pudo actualizar la salud del DevGotchi');
      }
    },

    /**
     * Mutation.cuidarDevgotchi
     * Recupera 10 puntos de salud sin superar el máximo de 100
     */
    cuidarDevgotchi: async (_, { projectId }, { db }) => {
      try {
        const projectQuery = projectId
          ? 'SELECT id, devgotchi_health FROM projects WHERE id = $1'
          : 'SELECT id, devgotchi_health FROM projects ORDER BY id ASC LIMIT 1';
        const projectResult = await db.query(projectQuery, projectId ? [projectId] : []);
        if (projectResult.rows.length === 0) throw new Error('Proyecto no encontrado');

        const currentHealth = projectResult.rows[0].devgotchi_health;
        const newHealth = Math.min(100, currentHealth + 10);
        const targetProjectId = projectId || projectResult.rows[0].id;
        const updateProjectQuery = `
          UPDATE projects
          SET devgotchi_health = $1, devgotchi_mood = 'happy'
          WHERE id = $2
          RETURNING *
        `;
        const updatedProject = await db.query(updateProjectQuery, [newHealth, targetProjectId]);

        const insertHistoryQuery = `
          INSERT INTO health_history (project_id, health_value, mood)
          VALUES ($1, $2, 'happy')
        `;
        await db.query(insertHistoryQuery, [targetProjectId, newHealth]);

        return formatProject(updatedProject.rows[0]);
      } catch (error) {
        console.error('Error caring for devgotchi:', error);
        throw new Error('No se pudo cuidar al DevGotchi');
      }
    },

    /**
     * Mutation.disminuirVida
     * Reduce 10 puntos de salud sin bajar de cero
     */
    disminuirVida: async (_, { projectId }, { db }) => {
      try {
        const projectQuery = 'SELECT devgotchi_health FROM projects WHERE id = $1';
        const projectResult = await db.query(projectQuery, [projectId]);
        if (projectResult.rows.length === 0) throw new Error('Proyecto no encontrado');

        const currentHealth = projectResult.rows[0].devgotchi_health;
        const newHealth = Math.max(0, currentHealth - 10);
        const updateProjectQuery = `
          UPDATE projects
          SET devgotchi_health = $1, devgotchi_mood = 'sad'
          WHERE id = $2
          RETURNING *
        `;
        const updatedProject = await db.query(updateProjectQuery, [newHealth, projectId]);

        const insertHistoryQuery = `
          INSERT INTO health_history (project_id, health_value, mood)
          VALUES ($1, $2, 'sad')
        `;
        await db.query(insertHistoryQuery, [projectId, newHealth]);

        return formatProject(updatedProject.rows[0]);
      } catch (error) {
        console.error('Error decreasing devgotchi health:', error);
        throw new Error('No se pudo disminuir la vida del DevGotchi');
      }
    },

    /**
     * Mutation.createActivity
     * Registra una nueva actividad en un proyecto
     */
    createActivity: async (_, { projectId, activityType, description, metadata, healthImpact, moodImpact }, { db }) => {
      try {
        const query = `
          INSERT INTO activities (uuid, project_id, activity_type, description, metadata, health_impact, mood_impact)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        const result = await db.query(query, [
          randomUUID(),
          projectId,
          activityType,
          description || null,
          metadata || null,
          healthImpact || 0,
          moodImpact || null,
        ]);
        return formatActivity(result.rows[0]);
      } catch (error) {
        console.error('Error creating activity:', error);
        throw new Error('No se pudo crear la actividad');
      }
    },

    /**
     * Mutation.createWebhook
     * Crea un webhook para un proyecto
     */
    createWebhook: async (_, { projectId, webhookUrl, eventType }, { db }) => {
      try {
        const query = `
          INSERT INTO webhooks (uuid, project_id, webhook_url, event_type, is_active)
          VALUES ($1, $2, $3, $4, true)
          RETURNING *
        `;
        const result = await db.query(query, [randomUUID(), projectId, webhookUrl, eventType]);
        return formatWebhook(result.rows[0]);
      } catch (error) {
        console.error('Error creating webhook:', error);
        throw new Error('No se pudo crear el webhook');
      }
    },

    /**
     * Mutation.toggleWebhook
     * Activa o desactiva un webhook
     */
    toggleWebhook: async (_, { id, isActive }, { db }) => {
      try {
        const query = `
          UPDATE webhooks
          SET is_active = $1
          WHERE id = $2
          RETURNING *
        `;
        const result = await db.query(query, [isActive, id]);
        if (result.rows.length === 0) throw new Error('Webhook no encontrado');
        return formatWebhook(result.rows[0]);
      } catch (error) {
        console.error('Error toggling webhook:', error);
        throw new Error('No se pudo actualizar el webhook');
      }
    },

    /**
     * Mutation.deleteProject
     * Elimina un proyecto
     */
    deleteProject: async (_, { id }, { db }) => {
      try {
        const query = 'DELETE FROM projects WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows.length > 0;
      } catch (error) {
        console.error('Error deleting project:', error);
        throw new Error('No se pudo eliminar el proyecto');
      }
    },

    /**
     * Mutation.deleteUser
     * Elimina un usuario
     */
    deleteUser: async (_, { id }, { db }) => {
      try {
        const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
        const result = await db.query(query, [id]);
        return result.rows.length > 0;
      } catch (error) {
        console.error('Error deleting user:', error);
        throw new Error('No se pudo eliminar el usuario');
      }
    },
  },

  // =====================
  // FIELD RESOLVERS - Resolvers para campos anidados
  // =====================
  
  /**
   * Cuando GraphQL necesita resolver campos anidados.
   * Ejemplo: query { project { user { username } } }
   * Necesita un resolver para Project.user
   */
  Project: {
    user: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await db.query(query, [parent.user_id]);
        if (result.rows.length === 0) return null;
        return formatUser(result.rows[0]);
      } catch (error) {
        console.error('Error fetching project user:', error);
        return null;
      }
    },

    activities: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM activities WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [parent.id]);
        return result.rows.map(formatActivity);
      } catch (error) {
        console.error('Error fetching activities:', error);
        return [];
      }
    },

    healthHistory: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM health_history WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [parent.id]);
        return result.rows.map(formatHealthRecord);
      } catch (error) {
        console.error('Error fetching health history:', error);
        return [];
      }
    },

    webhooks: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM webhooks WHERE project_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [parent.id]);
        return result.rows.map(formatWebhook);
      } catch (error) {
        console.error('Error fetching webhooks:', error);
        return [];
      }
    },
  },

  User: {
    projects: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await db.query(query, [parent.id]);
        return result.rows.map(formatProject);
      } catch (error) {
        console.error('Error fetching user projects:', error);
        return [];
      }
    },
  },

  Activity: {
    project: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await db.query(query, [parent.project_id]);
        if (result.rows.length === 0) return null;
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error fetching activity project:', error);
        return null;
      }
    },
  },

  HealthRecord: {
    project: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await db.query(query, [parent.project_id]);
        if (result.rows.length === 0) return null;
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error fetching health record project:', error);
        return null;
      }
    },
  },

  Webhook: {
    project: async (parent, _, { db }) => {
      try {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await db.query(query, [parent.project_id]);
        if (result.rows.length === 0) return null;
        return formatProject(result.rows[0]);
      } catch (error) {
        console.error('Error fetching webhook project:', error);
        return null;
      }
    },
  },
};

// =====================
// FUNCIONES AUXILIARES - Formateo de datos
// =====================

/**
 * Formateo de Usuario
 * Convierte los nombres de columnas de BD (snake_case)
 * a nombres de GraphQL (camelCase)
 */
function formatUser(row) {
  return {
    id: row.id.toString(),
    uuid: row.uuid,
    email: row.email,
    username: row.username,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    status: row.status,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
  };
}

function formatProject(row) {
  return {
    id: row.id.toString(),
    uuid: row.uuid,
    userId: row.user_id.toString(),
    name: row.name,
    description: row.description,
    repositoryUrl: row.repository_url,
    status: row.status,
    devgotchiHealth: row.devgotchi_health,
    devgotchiMood: row.devgotchi_mood,
    lastCommitDate: formatDate(row.last_commit_date),
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
    nombre: row.name,
    vida_actual: row.devgotchi_health,
    repository_url: row.repository_url,
  };
}

function formatActivity(row) {
  return {
    id: row.id.toString(),
    uuid: row.uuid,
    projectId: row.project_id.toString(),
    activityType: row.activity_type,
    description: row.description,
    metadata: row.metadata ? JSON.stringify(row.metadata) : null,
    healthImpact: row.health_impact,
    moodImpact: row.mood_impact,
    createdAt: formatDate(row.created_at),
  };
}

function formatHealthRecord(row) {
  return {
    id: row.id.toString(),
    uuid: row.uuid,
    projectId: row.project_id.toString(),
    healthValue: row.health_value,
    mood: row.mood,
    createdAt: formatDate(row.created_at),
  };
}

function formatWebhook(row) {
  return {
    id: row.id.toString(),
    uuid: row.uuid,
    projectId: row.project_id.toString(),
    webhookUrl: row.webhook_url,
    eventType: row.event_type,
    isActive: row.is_active,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at),
  };
}

function formatDate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

module.exports = { resolvers };
