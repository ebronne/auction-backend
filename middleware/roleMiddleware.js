// middleware/roleMiddleware.js
module.exports = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
  next();
};
