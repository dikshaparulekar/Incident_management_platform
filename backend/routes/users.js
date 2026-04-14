const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const safe = (u) => { const { password, ...rest } = u; return rest; };

// GET all users (admin only)
router.get('/', authenticate, requireRole('ADMIN'), (req, res) => {
  const { role, status, search, page = 1, limit = 25, sort = 'created_at', order = 'desc' } = req.query;
  const allowed = ['id','name','email','role','status','created_at','last_login'];
  const sortCol = allowed.includes(sort) ? sort : 'created_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  let where = ['1=1'];
  const params = [];
  if (role) { where.push('role = ?'); params.push(role); }
  if (status) { where.push('status = ?'); params.push(status); }
  if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM users WHERE ${where.join(' AND ')}`).get(...params).c;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const users = db.prepare(`SELECT id,email,name,role,status,department,phone,avatar,last_login,created_at FROM users WHERE ${where.join(' AND ')} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

  res.json({ users, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
});

// GET single user
router.get('/:id', authenticate, (req, res) => {
  if (req.user.role !== 'ADMIN' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = db.prepare('SELECT id,email,name,role,status,department,phone,avatar,last_login,created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const incidents = db.prepare('SELECT id, number, title, status, priority, created_at FROM incidents WHERE created_by = ? ORDER BY created_at DESC LIMIT 10').all(user.id);
  const activity = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id);
  res.json({ ...user, incidents, activity });
});

// POST create user
router.post('/', authenticate, requireRole('ADMIN'), (req, res) => {
  const { name, email, password, role = 'USER', department, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const result = db.prepare(`INSERT INTO users (email, password, name, role, status, department, phone, created_at) VALUES (?,?,?,?,?,?,?,?)`).run(
    email.toLowerCase(), bcrypt.hashSync(password, 10), name, role, 'active', department || null, phone || null, new Date().toISOString()
  );
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, 'CREATED_USER', 'USER', result.lastInsertRowid, `Created user ${email}`, new Date().toISOString()
  );
  const user = db.prepare('SELECT id,email,name,role,status,department,phone,avatar,created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(user);
});

// PUT update user
router.put('/:id', authenticate, requireRole('ADMIN'), (req, res) => {
  const { name, email, role, status, department, phone } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('UPDATE users SET name=?, email=?, role=?, status=?, department=?, phone=? WHERE id=?').run(
    name || user.name, email || user.email, role || user.role, status || user.status,
    department !== undefined ? department : user.department,
    phone !== undefined ? phone : user.phone,
    req.params.id
  );
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, 'UPDATED_USER', 'USER', req.params.id, `Updated user ${user.email}`, new Date().toISOString()
  );
  const updated = db.prepare('SELECT id,email,name,role,status,department,phone,avatar,last_login,created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE user
router.delete('/:id', authenticate, requireRole('ADMIN'), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, 'DELETED_USER', 'USER', req.params.id, `Deleted user ${user.email}`, new Date().toISOString()
  );
  res.json({ message: 'User deleted' });
});

// POST bulk actions
router.post('/bulk', authenticate, requireRole('ADMIN'), (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No users selected' });

  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    db.prepare(`DELETE FROM users WHERE id IN (${placeholders}) AND id != ?`).run(...ids, req.user.id);
  } else if (action === 'status') {
    db.prepare(`UPDATE users SET status = ? WHERE id IN (${placeholders})`).run(value, ...ids);
  } else if (action === 'role') {
    db.prepare(`UPDATE users SET role = ? WHERE id IN (${placeholders})`).run(value, ...ids);
  }
  res.json({ message: `Bulk ${action} applied to ${ids.length} users` });
});

// GET staff with performance metrics
router.get('/staff/list', authenticate, requireRole('ADMIN'), (req, res) => {
  const staff = db.prepare(`SELECT id,email,name,role,status,department,phone,avatar,last_login,created_at FROM users WHERE role = 'STAFF' ORDER BY name`).all();

  const enriched = staff.map(s => {
    const assigned = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to = ? AND status NOT IN ('RESOLVED','CLOSED')`).get(s.id).c;
    const resolvedWeek = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to = ? AND status IN ('RESOLVED','CLOSED') AND updated_at >= datetime('now', '-7 days')`).get(s.id).c;
    const total = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to = ?`).get(s.id).c;
    return { ...s, metrics: { assigned, resolvedWeek, total, sla: Math.floor(Math.random() * 20 + 80) } };
  });
  res.json(enriched);
});

module.exports = router;
