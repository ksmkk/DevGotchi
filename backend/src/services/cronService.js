const cron = require('node-cron');

async function applyHourlyHealthDecay(db) {
  const { rows } = await db.query(
    'SELECT id FROM projects WHERE status = $1',
    ['active'],
  );
  let updatedCount = 0;

  for (const project of rows) {
    const result = await db.query(
      `UPDATE projects
       SET devgotchi_health = CASE
         WHEN devgotchi_health > 0 THEN devgotchi_health - 1
         ELSE 0
       END
       WHERE id = $1 AND status = $2`,
      [project.id, 'active'],
    );
    updatedCount += result.rowCount || 0;
  }

  return updatedCount;
}

function startHealthDecayCron(db) {
  const database = db || require('../../db/database').pool;

  return cron.schedule('0 * * * *', async () => {
    try {
      const updatedCount = await applyHourlyHealthDecay(database);
      console.log(`[health-cron] Actualizada la salud de ${updatedCount} DevGotchi(s) activos.`);
    } catch (error) {
      console.error('[health-cron] No se pudo actualizar la salud de los DevGotchis:', error);
    }
  });
}

module.exports = { applyHourlyHealthDecay, startHealthDecayCron };