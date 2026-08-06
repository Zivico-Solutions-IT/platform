const Project = require('../models/Project');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const tradingView = require('../services/tradingViewService');

const currentCompanyProject = async (req) => {
  if (req.projectId) {
    const selected = await Project.findByPk(req.projectId);
    if (selected) return selected;
  }
  return Project.findOne({ where: { identifier: 'a5markets' } });
};

exports.companyStatus = async (req, res) => {
  try {
    const project = await currentCompanyProject(req);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    return res.json({ company: { id: project.id, name: project.name, identifier: project.identifier, status: project.status } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load company status.' });
  }
};

exports.updateCompanyStatus = async (req, res) => {
  try {
    const status = String(req.body.status || '').trim().toLowerCase();
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Company status must be active or suspended.' });
    }
    const project = await currentCompanyProject(req);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    await project.update({ status });
    return res.json({ company: { id: project.id, name: project.name, identifier: project.identifier, status: project.status } });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update company status.' });
  }
};

const STAFF_PERMISSIONS = ['overview', 'marginAlerts', 'users', 'userManagement', 'assignUsers', 'userManagementUsers', 'verifications', 'deposits', 'depositAddresses', 'depositsList', 'referrals', 'withdrawals', 'withdrawalsList', 'withdrawalDetails', 'userLevels', 'trades', 'addTrading', 'symbols', 'agents'];
const normalizePermissions = (permissions) => {
  let parsed = permissions;
  if (typeof permissions === 'string') {
    try { parsed = JSON.parse(permissions); } catch (e) { parsed = []; }
  }
  const selected = new Set(Array.isArray(parsed)
    ? parsed.filter((permission) => STAFF_PERMISSIONS.includes(permission))
    : []);
  if (selected.has('userManagement')) { selected.add('assignUsers'); selected.add('userManagementUsers'); }
  if (selected.has('deposits')) { selected.add('depositAddresses'); selected.add('depositsList'); }
  if (selected.has('withdrawals')) { selected.add('withdrawalsList'); selected.add('withdrawalDetails'); }
  if (selected.has('assignUsers') || selected.has('userManagementUsers')) selected.add('userManagement');
  if (selected.has('depositAddresses') || selected.has('depositsList')) selected.add('deposits');
  if (selected.has('withdrawalsList') || selected.has('withdrawalDetails')) selected.add('withdrawals');
  return Array.from(selected);
};

exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.findAll({ order: [['id', 'ASC']] });
    let admins = await User.findAll({ 
      where: { role: 'admin' }, 
      attributes: ['id', 'name', 'email', 'phone', 'permissions', 'projectId', 'role', 'createdAt'],
      skipProjectId: true,
    });

    const hashedPassword = await bcrypt.hash('admin123', 12);
    let adminsUpdated = false;

    // Ensure every project has at least one administrator user account
    for (const project of projects) {
      const projectAdmins = admins.filter((a) => a.projectId === project.id);
      if (projectAdmins.length === 0) {
        const newAdmin = await User.create({
          name: `${project.name} Admin`,
          email: `admin@${project.identifier}.com`,
          password: hashedPassword,
          role: 'admin',
          projectId: project.id,
          accountType: 'Live',
          permissions: Array.isArray(project.permissions) ? project.permissions : [],
        }, { skipProjectId: true });
        admins.push(newAdmin);
        adminsUpdated = true;
      }
    }

    // Attach admins to their respective projects
    const projectsWithAdmins = projects.map(p => {
      const projectData = p.toJSON();
      projectData.admins = admins.filter(a => a.projectId === p.id);
      return projectData;
    });

    res.json({ projects: projectsWithAdmins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to list projects.' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, identifier, status, permissions } = req.body;
    if (!name || !identifier) return res.status(400).json({ message: 'Name and identifier are required.' });
    const projectPermissions = normalizePermissions(permissions);
    const project = await Project.create({ name, identifier, status: status || 'active', permissions: projectPermissions });
    
    // Create default admin for the project
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await User.create({
      name: `${name} Admin`,
      email: `admin@${identifier}.com`,
      password: hashedPassword,
      role: 'admin',
      projectId: project.id,
      accountType: 'Live', // Admins usually don't need this but we set a default
      permissions: projectPermissions,
    });

    const projectData = project.toJSON();
    projectData.admins = [adminUser];

    res.status(201).json({ project: projectData });
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Project identifier already exists.' });
    }
    res.status(500).json({ message: 'Failed to create project.' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, identifier, status, permissions } = req.body;
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const nextPermissions = permissions !== undefined ? normalizePermissions(permissions) : project.permissions;
    await project.update({
      name: name !== undefined ? name : project.name,
      identifier: identifier !== undefined ? identifier : project.identifier,
      status: status !== undefined ? status : project.status,
      permissions: nextPermissions,
    });
    if (permissions !== undefined) {
      const allowed = new Set(nextPermissions);
      const staff = await User.findAll({
        where: { projectId: project.id, role: ['admin', 'agent', 'manager'] },
        skipProjectId: true,
      });
      await Promise.all(staff.map((member) => member.update({
        permissions: normalizePermissions(member.permissions).filter((permission) => allowed.has(permission)),
      }, { skipProjectId: true })));
    }
    res.json({ project });
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Project identifier already exists.' });
    }
    res.status(500).json({ message: 'Failed to update project.' });
  }
};

exports.updateProjectAdminPermissions = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    // Master can switch companies without changing the request's previously
    // selected tenant header, so this lookup must not inherit that stale scope.
    const admin = await User.findOne({
      where: { id: req.params.adminId, projectId: project.id, role: 'admin' },
      skipProjectId: true,
    });
    if (!admin) return res.status(404).json({ message: 'Company administrator not found.' });

    const allowed = new Set(normalizePermissions(project.permissions));
    const permissions = normalizePermissions(req.body.permissions).filter((permission) => allowed.has(permission));
    await admin.update({ permissions }, { skipProjectId: true });
    return res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, permissions } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update administrator permissions.' });
  }
};

const symbolsFor = (project) => {
  const visibility = project?.symbolVisibility && typeof project.symbolVisibility === 'object'
    ? project.symbolVisibility
    : {};
  return tradingView.instruments.map((instrument) => ({
    symbol: instrument.symbol,
    group: instrument.group,
    description: instrument.description,
    visible: visibility[instrument.symbol] !== false,
  }));
};

exports.projectSymbols = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    return res.json({ symbols: symbolsFor(project) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to load company symbols.' });
  }
};

exports.updateProjectSymbols = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Company not found.' });
    if (!Array.isArray(req.body.visibilities)) return res.status(400).json({ message: 'Visibilities array is required.' });
    const validSymbols = new Set(tradingView.instruments.map((instrument) => instrument.symbol));
    const symbolVisibility = {};
    req.body.visibilities.forEach((item) => {
      if (validSymbols.has(item?.symbol)) symbolVisibility[item.symbol] = Boolean(item.visible);
    });
    await project.update({ symbolVisibility });
    return res.json({ ok: true, symbols: symbolsFor(project) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to save company symbols.' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    
    // In a real application, you'd likely want to "soft delete" or prevent deletion if users exist
    await project.destroy();
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete project.' });
  }
};
