const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/authMiddleware');
const { BonusPost } = require('../models');

router.get('/', auth, async (req, res, next) => {
  try {
    // Include legacy company-local posts created before project IDs were
    // attached, while preferring the current client's company posts.
    const where = req.projectId
      ? { isActive: true, [Op.or]: [{ projectId: req.projectId }, { projectId: null }] }
      : { isActive: true };
    const posts = await BonusPost.findAll({ where, order: [['createdAt', 'DESC']], limit: 2, attributes: ['id', 'title', 'image', 'createdAt'] });
    return res.json({ posts });
  } catch (error) { return next(error); }
});
module.exports = router;
