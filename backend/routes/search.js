const router = require('express').Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ incidents: [], users: [] });

  const like = `%${q}%`;
  let incidents = [];
  let users = [];

  if (req.user.role === 'ADMIN') {
    incidents = db.prepare(`SELECT id, number, title, status, priority FROM incidents WHERE title LIKE ? OR number LIKE ? OR description LIKE ? LIMIT 10`).all(like, like, like);
    users = db.prepare(`SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10`).all(like, like);
  } else if (req.user.role === 'STAFF') {
    incidents = db.prepare(`SELECT id, number, title, status, priority FROM incidents WHERE assigned_to=? AND (title LIKE ? OR number LIKE ?) LIMIT 10`).all(req.user.id, like, like);
  } else {
    incidents = db.prepare(`SELECT id, number, title, status, priority FROM incidents WHERE created_by=? AND (title LIKE ? OR number LIKE ?) LIMIT 10`).all(req.user.id, like, like);
  }

  res.json({ incidents, users });
});

module.exports = router;
