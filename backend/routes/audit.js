const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('ADMIN'), (req, res) => {
  const { user_id, action, entity_type, search, page = 1, limit = 50 } = req.query;
  let where = ['1=1'];
  const params = [];

  if (user_id) { where.push('a.user_id = ?'); params.push(user_id); }
  if (action) { where.push('a.action = ?'); params.push(action); }
  if (entity_type) { where.push('a.entity_type = ?'); params.push(entity_type); }
  if (search) { where.push('(a.details LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM activity_logs a LEFT JOIN users u ON a.user_id=u.id WHERE ${where.join(' AND ')}`).get(...params).c;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const logs = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
    FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id
    WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
});

router.get('/actions', authenticate, requireRole('ADMIN'), (req, res) => {
  const actions = db.prepare('SELECT DISTINCT action FROM activity_logs ORDER BY action').all().map(r => r.action);
  res.json(actions);
});

module.exports = router;
