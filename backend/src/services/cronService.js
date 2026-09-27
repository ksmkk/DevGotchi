const cron = require('node-cron');

async function applyHourlyRepositoryHealthSync(db, repositoryAnalyzer) {
  const { rows } = await db.query(
    'SELECT id, repository_url FROM projects WHERE status = $1 AND repository_url IS NOT NULL',
    ['active'],
  );
  let updatedCount = 0;

  for (const project of rows) {
    try {
      const diagnosis = await repositoryAnalyzer(project.repository_url);
      const mood = diagnosis.score <= 0 ? 'dead' : diagnosis.score < 50 ? 'sad' : 'happy';
      const result = await db.query(
        `UPDATE projects
         SET devgotchi_health = $1, devgotchi_mood = $2,
             repository_analysis = $3, last_analysis_at = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND status = $6`,
        [diagnosis.score, mood, JSON.stringify(diagnosis), diagnosis.analyzedAt, project.id, 'active'],
      );
      updatedCount += result.rowCount || 0;
    } catch (error) {
      console.error(`[health-cron] No se pudo analizar el proyecto ${project.id}:`, error.message);
    }
  }

  return updatedCount;
}

function startRepositoryHealthCron(db, repositoryAnalyzer) {
  const database = db || require('../../db/database').pool;

  return cron.schedule('0 * * * *', async () => {
    try {
      const updatedCount = await applyHourlyRepositoryHealthSync(database, repositoryAnalyzer);
      console.log(`[health-cron] Sincronizada la salud técnica de ${updatedCount} DevGotchi(s).`);
    } catch (error) {
      console.error('[health-cron] No se pudo actualizar la salud de los DevGotchis:', error);
    }
  });
}

module.exports = { applyHourlyRepositoryHealthSync, startRepositoryHealthCron };
