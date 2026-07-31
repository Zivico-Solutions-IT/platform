const jwt = require('jsonwebtoken');
const axios = require('axios');
const { User, Project } = require('../models');
const tenantStorage = require('../config/tenantStorage');

const ONLINE_WINDOW_MS = 45 * 1000;

// External tenant API endpoints (Port 5001 in local dev, VPS 2 in production)
const EXTERNAL_TENANT_APIS = {
  6: process.env.NODE_ENV === 'production'
    ? 'https://server.veltriumfx.com/api'
    : 'http://localhost:5001/api',
};

module.exports = async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    if (!process.env.JWT_SECRET) return res.status(500).json({ message: 'Authentication is not configured.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findByPk(payload.id, { attributes: { exclude: ['password'] } });

    // Master sessions may originate from the other platform database, where
    // the same master account can have a different numeric ID.
    if (payload.role === 'master') {
      const masterEmail = String(payload.email || '').trim().toLowerCase();
      const localMaster = masterEmail
        ? await User.findOne({ where: { email: masterEmail, role: 'master' }, attributes: { exclude: ['password'] } })
        : null;
      user = localMaster || {
        id: payload.id,
        name: 'Master Admin',
        email: masterEmail,
        role: 'master',
        update: async () => {},
      };
    }
    if (!user) return res.status(401).json({ message: 'Account not found.' });
    if (user.role !== 'master' && user.projectId) {
      const project = await Project.findByPk(user.projectId);
      if (!project || project.status !== 'active') {
        return res.status(403).json({ message: 'This company is inactive. Access is currently unavailable.' });
      }
    }
    if (req.path !== '/offline') {
      await user.update({ onlineUntil: new Date(Date.now() + ONLINE_WINDOW_MS) });
    }
    req.user = user;

    let projectId = null;
    if (user.role === 'master') {
      const headerProjectId = req.headers['x-project-id'];
      if (headerProjectId) {
        projectId = parseInt(headerProjectId, 10);
      }
    } else {
      projectId = user.projectId;
    }
    req.projectId = projectId;

    // Cross-Tenant Proxying:
    // When Master user accesses an external project (e.g. VeltriumFX on Port 5001),
    // proxy the API request directly to the target project's backend to load its standalone database.
    if (user.role === 'master' && projectId && EXTERNAL_TENANT_APIS[projectId]) {
      const targetApiUrl = EXTERNAL_TENANT_APIS[projectId];
      const isMasterRoute = req.originalUrl.includes('/api/master') || req.originalUrl.includes('/api/auth/me');
      if (!isMasterRoute) {
        try {
          const targetUrl = `${targetApiUrl.replace(/\/api\/?$/, '')}${req.originalUrl}`;
          const proxyResponse = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            params: req.query,
            headers: {
              authorization: req.headers.authorization,
              'x-project-id': projectId,
              'content-type': req.headers['content-type'] || 'application/json',
            },
            timeout: 10000,
          });
          return res.status(proxyResponse.status).json(proxyResponse.data);
        } catch (proxyError) {
          if (proxyError.response) {
            return res.status(proxyError.response.status).json(proxyError.response.data);
          }
          console.error(`[Master Cross-Tenant Proxy] Connection error to ${targetApiUrl}:`, proxyError.message);
          // Fallback to local DB query if target backend is offline
        }
      }
    }
    
    if (req.projectId) {
      tenantStorage.run({ projectId: req.projectId }, () => {
        next();
      });
    } else {
      return next();
    }
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};
