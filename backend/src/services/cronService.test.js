jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const cron = require('node-cron');
const { applyHourlyHealthDecay, startHealthDecayCron } = require('./cronService');

describe('cron de salud de DevGotchi', () => {
  beforeEach(() => cron.schedule.mockReset());

  test('reduce un punto a cada proyecto activo y no baja de cero', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 }),
    };

    const updatedCount = await applyHourlyHealthDecay(db);

    expect(db.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id FROM projects WHERE status = $1',
      ['active'],
    );
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHEN devgotchi_health > 0 THEN devgotchi_health - 1'),
      [1, 'active'],
    );
    expect(db.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('WHEN devgotchi_health > 0 THEN devgotchi_health - 1'),
      [2, 'active'],
    );
    expect(updatedCount).toBe(2);
  });

  test('programa el servicio al inicio de cada hora', () => {
    const task = { stop: jest.fn() };
    const db = { query: jest.fn() };
    cron.schedule.mockReturnValue(task);

    const scheduledTask = startHealthDecayCron(db);

    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    expect(scheduledTask).toBe(task);
  });
});