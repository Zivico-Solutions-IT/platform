const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/authMiddleware');
const { BonusPost } = require('../models');

const visibleBonusWhere = (req) => (req.projectId
  ? { isActive: true, [Op.or]: [{ projectId: req.projectId }, { projectId: null }] }
  : { isActive: true });

// Only counts are loaded with the profile; artwork loads after the user opens
// the Bonus Offers page, keeping the initial profile request lightweight.
router.get('/count', auth, async (req, res, next) => {
  try { return res.json({ count: Math.min(await BonusPost.count({ where: visibleBonusWhere(req) }), 2) }); }
  catch (error) { return next(error); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const posts = await BonusPost.findAll({ where: visibleBonusWhere(req), order: [['createdAt', 'DESC']], limit: 2, attributes: ['id', 'title', 'image', 'createdAt'] });
    return res.json({ posts });
  } catch (error) { return next(error); }
});

module.exports = router;
