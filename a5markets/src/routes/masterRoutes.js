const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const authMiddleware = require('../middleware/authMiddleware');
const masterMiddleware = (req, res, next) => {
  if (req.user?.role !== 'master') return res.status(403).json({ message: 'Master access required.' });
  return next();
};

router.use(authMiddleware);
router.use(masterMiddleware);

router.get('/company-status', masterController.companyStatus);
router.put('/company-status', masterController.updateCompanyStatus);
router.get('/projects', masterController.listProjects);
router.post('/projects', masterController.createProject);
router.put('/projects/:id', masterController.updateProject);
router.put('/projects/:id/admins/:adminId/permissions', masterController.updateProjectAdminPermissions);
router.get('/projects/:id/symbols', masterController.projectSymbols);
router.put('/projects/:id/symbols', masterController.updateProjectSymbols);
router.delete('/projects/:id', masterController.deleteProject);

module.exports = router;
