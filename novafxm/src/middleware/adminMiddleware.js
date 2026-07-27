module.exports = function adminMiddleware(req, res, next) {
  if (!['admin', 'agent', 'master', 'manager'].includes(req.user?.role)) return res.status(403).json({ message: 'Administrator access required.' });
  return next();
};
