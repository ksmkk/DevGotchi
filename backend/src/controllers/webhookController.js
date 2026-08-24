const { evaluateProjectHealth } = require('../services/devgotchiService');
const { setProjectStatus } = require('../store/projectStore');

function handleProjectWebhook(req, res) {
  const payload = req.body || {};

  const result = evaluateProjectHealth(payload);
  setProjectStatus(result.project, result);

  return res.status(200).json({
    ok: true,
    data: result,
  });
}

module.exports = {
  handleProjectWebhook,
};
