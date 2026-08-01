const jwt = require('jsonwebtoken');
const { User, Project } = require('../models');
const tenantStorage = require('../config/tenantStorage');

const ONLINE_WINDOW_MS = 45 * 1000;

module.exports = async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured.' });
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findByPk(payload.id, { attributes: { exclude: ['password'] } });
    
    // Cross-VPS Master Token Handling:
    // If token belongs to a Master user from NovaFXM (VPS 1) and does not exist in VeltriumFX's local DB yet,
    // construct a valid Master user context for this request.
    if (payload.role === 'master') {
      const masterEmail = String(payload.email || 'master@novafxm.com').trim().toLowerCase();
      const localMaster = await User.findOne({ where: { email: masterEmail, role: 'master' }, attributes: { exclude: ['password'] } });
      user = localMaster || {
        id: payload.id,
        name: 'Nova Master Admin',
        email: masterEmail,
        role: 'master',
        update: async () => {},
      };
    }

    if (!user) return res.status(401).json({ message: 'Account not found.' });
    
    if (user.role !== 'master' && user.projectId) {
      const project = await Project.findByPk(user.projectId);
      const consoleRole = ['admin', 'agent', 'manager'].includes(user.role);
      if (!project || project.status === 'inactive') {
        return res.status(403).json({ message: 'This company is inactive. Access is currently unavailable.' });
      }
      if (project.status === 'suspended' && consoleRole) {
        return res.status(403).json({ message: 'This company console is frozen. Contact support to unlock.' });
      }
    }

    if (req.path !== '/offline' && typeof user.update === 'function') {
      await user.update({ onlineUntil: new Date(Date.now() + ONLINE_WINDOW_MS) }).catch(() => {});
    }

    req.user = user;
    if (user.role === 'master') {
      const headerProjectId = req.headers['x-project-id'];
      if (headerProjectId) {
        req.projectId = parseInt(headerProjectId, 10);
      }
    } else {
      req.projectId = user.projectId;
    }
    
    if (req.projectId) {
      tenantStorage.run({ projectId: req.projectId }, () => {
        next();
      });
    } else {
      return next();
    }
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
