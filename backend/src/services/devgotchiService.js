function normalizeProjectStatus(status) {
  if (!status) {
    return 'unknown';
  }

  return String(status).trim().toLowerCase();
}

function evaluateProjectHealth(projectData = {}) {
  const { project, status, branch, workflow, repository } = projectData;
  const normalizedStatus = normalizeProjectStatus(status);

  const rules = {
    success: {
      health: 'healthy',
      vida: 100,
      message: 'Todo está bien: el pipeline pasó correctamente',
    },
    passed: {
      health: 'healthy',
      vida: 100,
      message: 'Todo está bien: el pipeline pasó correctamente',
    },
    in_progress: {
      health: 'warning',
      vida: 60,
      message: 'El proyecto está en ejecución y aún no hay resultado final',
    },
    running: {
      health: 'warning',
      vida: 60,
      message: 'El proyecto está en ejecución y aún no hay resultado final',
    },
    queued: {
      health: 'warning',
      vida: 60,
      message: 'El proyecto está en ejecución y aún no hay resultado final',
    },
    failure: {
      health: 'critical',
      vida: 25,
      message: 'El proyecto está en peligro: hubo una falla en la ejecución',
    },
    failed: {
      health: 'critical',
      vida: 25,
      message: 'El proyecto está en peligro: hubo una falla en la ejecución',
    },
    error: {
      health: 'critical',
      vida: 25,
      message: 'El proyecto está en peligro: hubo una falla en la ejecución',
    },
  };

  const activeRule = rules[normalizedStatus] || {
    health: 'unknown',
    vida: 50,
    message: 'Estado desconocido recibido por el backend',
  };

  return {
    project: project || repository || 'unknown-project',
    branch: branch || 'main',
    workflow: workflow || 'unknown-workflow',
    status: normalizedStatus,
    health: activeRule.health,
    vida: activeRule.vida,
    message: activeRule.message,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  evaluateProjectHealth,
  normalizeProjectStatus,
};
