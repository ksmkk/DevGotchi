const projectStatuses = new Map();

function normalizeProjectKey(projectName) {
  return String(projectName || 'unknown-project').trim().toLowerCase();
}

function setProjectStatus(projectName, statusData) {
  const key = normalizeProjectKey(projectName);

  const normalizedData = {
    ...statusData,
    project: statusData.project || 'unknown-project',
    updatedAt: new Date().toISOString(),
  };

  projectStatuses.set(key, normalizedData);

  return normalizedData;
}

function getAllProjects() {
  return Array.from(projectStatuses.values());
}

function getProjectStatus(projectName) {
  const key = normalizeProjectKey(projectName);
  return projectStatuses.get(key) || null;
}

module.exports = {
  setProjectStatus,
  getAllProjects,
  getProjectStatus,
};
