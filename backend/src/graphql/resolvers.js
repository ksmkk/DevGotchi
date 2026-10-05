const { randomBytes, randomUUID, scrypt } = require('node:crypto');
const { promisify } = require('node:util');

const scryptAsync = promisify(scrypt);

const LOCAL_USER_EMAIL = 'local@devgotchi.invalid';
const LOCAL_USERNAME = 'devgotchi-local';

async function hashPassword(password) {
  const normalizedPassword = String(password || '');
  if (normalizedPassword.length < 8 || normalizedPassword.length > 128) {
    throw new Error('La contraseña debe tener entre 8 y 128 caracteres');
  }

  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(normalizedPassword, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${derivedKey.toString('base64url')}`;
}

const getOrCreateRepositoryOwner = async (db) => {
  const existingUser = await db.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  if (existingUser.rows.length > 0) {
    return existingUser.rows[0].id;
  }

  const createdUser = await db.query(
    `INSERT INTO users (uuid, email, username, password_hash, full_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [randomUUID(), LOCAL_USER_EMAIL, LOCAL_USERNAME, randomUUID(), 'Usuario local'],
  );

  if (createdUser.rows.length > 0) {
    return createdUser.rows[0].id;
  }

  const concurrentlyCreatedUser = await db.query(
    'SELECT id FROM users ORDER BY id ASC LIMIT 1',
  );
  if (concurrentlyCreatedUser.rows.length === 0) {
    throw new Error('No se pudo preparar el usuario local');
  }

  return concurrentlyCreatedUser.rows[0].id;
};

const ANALYSIS_CACHE_MS = 5 * 60 * 1000;

function parseStoredAnalysis(value) {
  if (!value) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

async function refreshRepositoryHealth(project, db, repositoryAnalyzer, force = false) {
  const storedAnalysis = parseStoredAnalysis(project.repository_analysis);
  const analyzedAt = project.last_analysis_at ? new Date(project.last_analysis_at).getTime() : 0;
  if (!repositoryAnalyzer || !project.repository_url) {
    return { ...project, repositoryDiagnosis: storedAnalysis };
  }
  if (!force && storedAnalysis && Date.now() - analyzedAt < ANALYSIS_CACHE_MS) {
    if (project.devgotchi_health !== storedAnalysis.score) {
      const synchronized = await db.query(
        `UPDATE projects SET devgotchi_health = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [storedAnalysis.score, project.id],
      );
      return { ...synchronized.rows[0], repositoryDiagnosis: storedAnalysis };
    }
    return { ...project, repositoryDiagnosis: storedAnalysis };
  }

  try {
    const diagnosis = await repositoryAnalyzer(project.repository_url);
    const mood = diagnosis.score <= 0 ? 'dead' : diagnosis.score < 50 ? 'sad' : 'happy';
    const result = await db.query(
      `UPDATE projects
       SET devgotchi_health = $1, devgotchi_mood = $2,
           repository_analysis = $3, last_analysis_at = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [diagnosis.score, mood, JSON.stringify(diagnosis), diagnosis.analyzedAt, project.id],
    );
    return { ...result.rows[0], repositoryDiagnosis: diagnosis };
  } catch (error) {
    console.error('Error analyzing repository:', error.message);
    const hasVerifiedAnalysis = storedAnalysis
      && !storedAnalysis.checks?.some((item) => item.key === 'github-access');
    const diagnosis = {
      score: hasVerifiedAnalysis ? storedAnalysis.score : 50,
      analyzedAt: new Date().toISOString(),
      summary: 'GitHub requiere acceso para analizar este repositorio.',
      checks: [{
        key: 'github-access',
        label: 'Acceso al repositorio',
        status: 'unknown',
        detail: 'El repositorio es privado o no está disponible. Configura GITHUB_TOKEN u OAuth con acceso de lectura.',
        impact: 0,
      }],
      recommendations: [
        'Conecta GitHub con permisos de lectura para habilitar tests, CI/CD y alertas de seguridad.',
      ],
    };
    const result = await db.query(
      `UPDATE projects
       SET devgotchi_health = $1, devgotchi_mood = 'neutral',
           repository_analysis = $2, last_analysis_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [diagnosis.score, JSON.stringify(diagnosis), diagnosis.analyzedAt, project.id],
    );
    return { ...(result.rows[0] || project), repositoryDiagnosis: diagnosis };
  }
}

async function markCurrentProject(db, project) {
  const result = await db.query(
    `UPDATE projects
     SET is_current = CASE WHEN id = $1 THEN true ELSE false END,
         updated_at = CASE WHEN id = $1 THEN CURRENT_TIMESTAMP ELSE updated_at END
     RETURNING *`,
    [project.id],
  );
  return result?.rows?.find((row) => String(row.id) === String(project.id)) || project;
}

const resolvers = {
  Devgotchi: {
    salud: (devgotchi) => {
      const puntosVida = devgotchi.vida_actual ?? devgotchi.devgotchiHealth;
      const animo = devgotchi.devgotchiMood;

      return {
        puntosVida,
        ultimoCommit: devgotchi.lastCommitDate ?? null,
        estado: puntosVida <= 0 ? 'Muerto' : animo === 'sad' ? 'Triste' : 'Feliz',
      };
    },
  },
  Query: {
    devgotchi: async (_, __, { db, repositoryAnalyzer }) => {
      const result = await db.query(
        `SELECT * FROM projects
         ORDER BY CASE WHEN is_current THEN 0 ELSE 1 END, updated_at DESC, id DESC
         LIMIT 1`,
      );
      if (result.rows.length === 0) return null;
      const project = await refreshRepositoryHealth(result.rows[0], db, repositoryAnalyzer);
      return formatProject(project);
    },

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

  Mutation: {
    conectarRepositorio: async (_, { repositoryUrl }, { db, repositoryAnalyzer }) => {
      const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
      const existing = await db.query(
        'SELECT * FROM projects WHERE repository_url = $1 LIMIT 1',
        [normalizedRepositoryUrl],
      );

      if (existing.rows.length > 0) {
        const selectedProject = await markCurrentProject(db, existing.rows[0]);
        const project = await refreshRepositoryHealth(selectedProject, db, repositoryAnalyzer, true);
        return formatProject(project);
      }

      const userId = await getOrCreateRepositoryOwner(db);

      const name = normalizedRepositoryUrl.split('/').filter(Boolean).pop() || 'repositorio';
      const result = await db.query(
        `INSERT INTO projects (uuid, user_id, name, repository_url, devgotchi_health, devgotchi_mood)
         VALUES ($1, $2, $3, $4, 100, 'neutral')
         RETURNING *`,
        [randomUUID(), userId, name, normalizedRepositoryUrl],
      );

      const selectedProject = await markCurrentProject(db, result.rows[0]);
      const project = await refreshRepositoryHealth(selectedProject, db, repositoryAnalyzer, true);
      return formatProject(project);
    },

    renombrarDevgotchi: async (_, { projectId, nombre }, { db }) => {
      const normalizedName = String(nombre || '').trim();
      if (normalizedName.length < 1 || normalizedName.length > 40) {
        throw new Error('El nombre debe tener entre 1 y 40 caracteres');
      }
      const result = await db.query(
        `UPDATE projects SET pet_name = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [normalizedName, projectId],
      );
      if (result.rows.length === 0) throw new Error('Proyecto no encontrado');
      return formatProject(result.rows[0]);
    },

    analizarRepositorio: async (_, { projectId }, { db, repositoryAnalyzer }) => {
      const result = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (result.rows.length === 0) throw new Error('Proyecto no encontrado');
      const project = await refreshRepositoryHealth(
        result.rows[0],
        db,
        repositoryAnalyzer,
        true,
      );
      return formatProject(project);
    },

    createUser: async (_, { email, username, password, fullName }, { db }) => {
      try {
        const passwordHash = await hashPassword(password);
        const query = `
          INSERT INTO users (uuid, email, username, password_hash, full_name)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const result = await db.query(query, [randomUUID(), email, username, passwordHash, fullName || null]);
        return formatUser(result.rows[0]);
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('No se pudo crear el usuario');
      }
    },

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

    updateDevgotchiHealth: async (_, { projectId, healthValue, mood }, { db }) => {
      try {
        const clampedHealth = Math.max(0, Math.min(100, healthValue));

        const updateProjectQuery = `
          UPDATE projects
          SET devgotchi_health = $1, devgotchi_mood = $2
          WHERE id = $3
          RETURNING *
        `;
        const projectResult = await db.query(updateProjectQuery, [clampedHealth, mood, projectId]);
        if (projectResult.rows.length === 0) throw new Error('Proyecto no encontrado');

        const insertHistoryQuery = `
          INSERT INTO health_history (uuid, project_id, health_value, mood)
          VALUES ($1, $2, $3, $4)
        `;
        await db.query(insertHistoryQuery, [randomUUID(), projectId, clampedHealth, mood]);

        return formatProject(projectResult.rows[0]);
      } catch (error) {
        console.error('Error updating devgotchi health:', error);
        throw new Error('No se pudo actualizar la salud del DevGotchi');
      }
    },

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
          INSERT INTO health_history (uuid, project_id, health_value, mood)
          VALUES ($1, $2, $3, 'happy')
        `;
        await db.query(insertHistoryQuery, [randomUUID(), targetProjectId, newHealth]);

        return formatProject(updatedProject.rows[0]);
      } catch (error) {
        console.error('Error caring for devgotchi:', error);
        throw new Error('No se pudo cuidar al DevGotchi');
      }
    },

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
          INSERT INTO health_history (uuid, project_id, health_value, mood)
          VALUES ($1, $2, $3, 'sad')
        `;
        await db.query(insertHistoryQuery, [randomUUID(), projectId, newHealth]);

        return formatProject(updatedProject.rows[0]);
      } catch (error) {
        console.error('Error decreasing devgotchi health:', error);
        throw new Error('No se pudo disminuir la vida del DevGotchi');
      }
    },

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
    nombre: row.pet_name || row.name,
    vida_actual: row.devgotchi_health,
    repository_url: row.repository_url,
    diagnostico: row.repositoryDiagnosis || parseStoredAnalysis(row.repository_analysis),
  };
}

function normalizeRepositoryUrl(repositoryUrl) {
  const normalizedUrl = String(repositoryUrl || '').trim().replace(/\/+$/, '').replace(/\.git$/i, '');

  if (!normalizedUrl) {
    throw new Error('La URL del repositorio es obligatoria');
  }

  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/i.test(normalizedUrl)) {
    throw new Error('La URL debe pertenecer a un repositorio de GitHub');
  }

  return normalizedUrl;
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
