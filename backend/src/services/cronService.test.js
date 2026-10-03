jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const cron = require('node-cron');
const { applyHourlyRepositoryHealthSync, startRepositoryHealthCron } = require('./cronService');

describe('cron de salud de DevGotchi', () => {
  beforeEach(() => cron.schedule.mockReset());

  test('sincroniza la vida con el diagnóstico técnico de cada repositorio', async () => {
    const diagnosis = {
      score: 68,
      analyzedAt: '2026-09-27T02:00:00.000Z',
      checks: [],
      recommendations: [],
    };
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, repository_url: 'https://github.com/acme/app' }] })
        .mockResolvedValueOnce({ rowCount: 1 })
    };
    const repositoryAnalyzer = jest.fn().mockResolvedValue(diagnosis);

    const updatedCount = await applyHourlyRepositoryHealthSync(db, repositoryAnalyzer);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, repository_url FROM projects WHERE status = $1 AND repository_url IS NOT NULL',
      ['active'],
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('SET devgotchi_health = $1'),
      [68, 'happy', JSON.stringify(diagnosis), diagnosis.analyzedAt, 1, 'active'],
    );
    expect(updatedCount).toBe(1);
  });

  test('programa el servicio al inicio de cada hora', () => {
    const task = { stop: jest.fn() };
    const db = { query: jest.fn() };
    cron.schedule.mockReturnValue(task);

    const scheduledTask = startRepositoryHealthCron(db, jest.fn());

    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    expect(scheduledTask).toBe(task);
  });
});
