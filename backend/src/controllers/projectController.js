const { getAllProjects, getProjectStatus } = require('../store/projectStore');

function listProjectStatuses(req, res) {
  const projects = getAllProjects();

  return res.status(200).json({
    ok: true,
    data: projects,
  });
}

function getProjectStatusByName(req, res) {
  const { projectName } = req.params;
  const project = getProjectStatus(projectName);

  if (!project) {
    return res.status(404).json({
      ok: false,
      message: 'Proyecto no encontrado',
    });
  }

  return res.status(200).json({
    ok: true,
    data: project,
  });
}

module.exports = {
  listProjectStatuses,
  getProjectStatusByName,
};
