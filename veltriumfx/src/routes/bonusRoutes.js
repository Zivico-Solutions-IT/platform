const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/authMiddleware');
const { BonusPost } = require('../models');

const visibleBonusWhere = (req) => (
  req.projectId
    ? { isActive: true, [Op.or]: [{ projectId: req.projectId }, { projectId: null }] }
    : { isActive: true }
);

// This deliberately returns no images. The profile button can show a badge
// without downloading potentially large base64 promotion artwork.
router.get('/count', auth, async (req, res, next) => {
  try {
    const count = await BonusPost.count({ where: visibleBonusWhere(req) });
    return res.json({ count: Math.min(count, 2) });
  } catch (error) { return next(error); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    // Include legacy company-local posts created before project IDs were
    // attached, while preferring the current client's company posts.
    const posts = await BonusPost.findAll({ where: visibleBonusWhere(req), order: [['createdAt', 'DESC']], limit: 2, attributes: ['id', 'title', 'image', 'createdAt'] });
    return res.json({ posts });
  } catch (error) { return next(error); }
});
module.exports = router;
