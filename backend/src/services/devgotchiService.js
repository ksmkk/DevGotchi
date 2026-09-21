function normalizeProjectStatus(status) {
  if (!status) {
    return 'unknown';
  }

  return String(status).trim().toLowerCase();
}

function evaluateProjectHealth(projectData = {}) {
  const { project, branch, workflow, repository } = projectData;
  const workflowRun = projectData.workflow_run || {};
  const status = projectData.status || projectData.conclusion || workflowRun.conclusion || workflowRun.status;
  const normalizedStatus = normalizeProjectStatus(status);
  const repositoryUrl = typeof repository === 'object'
    ? repository.html_url || repository.clone_url || repository.url
    : projectData.repositoryUrl;
  const repositoryName = typeof repository === 'object'
    ? repository.full_name || repository.name
    : repository;

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
    project: project || repositoryName || 'unknown-project',
    repositoryUrl,
    branch: branch || workflowRun.head_branch || 'main',
    workflow: workflow || workflowRun.name || 'unknown-workflow',
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
