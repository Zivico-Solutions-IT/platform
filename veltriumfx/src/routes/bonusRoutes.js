const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { BonusPost } = require('../models');

router.get('/', auth, async (req, res, next) => {
  try {
    const where = req.projectId ? { projectId: req.projectId, isActive: true } : { isActive: true };
    const posts = await BonusPost.findAll({ where, order: [['createdAt', 'DESC']], limit: 2, attributes: ['id', 'title', 'image', 'createdAt'] });
    return res.json({ posts });
  } catch (error) { return next(error); }
});
module.exports = router;
