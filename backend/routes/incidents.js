const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

function logActivity(userId, action, entityId, details, oldVal, newVal) {
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_value, new_value, details, created_at) VALUES (?,?,?,?,?,?,?,?)`).run(
    userId, action, 'INCIDENT', entityId, oldVal || null, newVal || null, details, new Date().toISOString()
  );
}

function notifyWatchers(incidentId, excludeUserId, title, message) {
  const watchers = db.prepare('SELECT user_id FROM watchers WHERE incident_id = ?').all(incidentId);
  const stmt = db.prepare(`INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?,?,?,?,?)`);
  for (const w of watchers) {
    if (w.user_id !== excludeUserId) {
      stmt.run(w.user_id, title, message, 'incident', new Date().toISOString());
    }
  }
}

function enrichIncident(inc) {
  if (!inc) return null;
  const creator = inc.created_by ? db.prepare('SELECT id,name,email,avatar FROM users WHERE id=?').get(inc.created_by) : null;
  const assignee = inc.assigned_to ? db.prepare('SELECT id,name,email,avatar FROM users WHERE id=?').get(inc.assigned_to) : null;
  return { ...inc, creator, assignee };
}

// GET incidents
router.get('/', authenticate, (req, res) => {
  const { status, priority, assigned_to, created_by, search, page = 1, limit = 25, sort = 'created_at', order = 'desc', view } = req.query;
  const allowed = ['id','number','title','status','priority','created_at','updated_at'];
  const sortCol = allowed.includes(sort) ? sort : 'created_at';
  const sortDir = order === 'asc' ? 'ASC' : 'DESC';

  let where = ['1=1'];
  const params = [];

  // Role-based filtering
  if (req.user.role === 'USER') {
    where.push('created_by = ?'); params.push(req.user.id);
  } else if (req.user.role === 'STAFF') {
    where.push('assigned_to = ?'); params.push(req.user.id);
  }

  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    where.push(`status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  }
  if (priority) {
    const priorities = priority.split(',').map(p => p.trim());
    where.push(`priority IN (${priorities.map(() => '?').join(',')})`);
    params.push(...priorities);
  }
  if (assigned_to && req.user.role === 'ADMIN') { where.push('assigned_to = ?'); params.push(assigned_to); }
  if (created_by && req.user.role === 'ADMIN') { where.push('created_by = ?'); params.push(created_by); }
  if (search) { where.push('(title LIKE ? OR description LIKE ? OR number LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  const total = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE ${where.join(' AND ')}`).get(...params).c;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const incidents = db.prepare(`SELECT * FROM incidents WHERE ${where.join(' AND ')} ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);

  const enriched = incidents.map(enrichIncident);
  res.json({ incidents: enriched, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
});

// GET single incident
router.get('/:id', authenticate, (req, res) => {
  const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });

  if (req.user.role === 'USER' && inc.created_by !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (req.user.role === 'STAFF' && inc.assigned_to !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar, u.role as user_role
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.incident_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  const activity = db.prepare(`
    SELECT a.*, u.name as user_name, u.avatar as user_avatar
    FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id
    WHERE a.entity_type = 'INCIDENT' AND a.entity_id = ? ORDER BY a.created_at ASC
  `).all(req.params.id);

  const watchers = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar FROM watchers w JOIN users u ON w.user_id = u.id WHERE w.incident_id = ?
  `).all(req.params.id);

  const attachments = db.prepare('SELECT * FROM attachments WHERE incident_id = ?').all(req.params.id);

  res.json({ ...enrichIncident(inc), comments, activity, watchers, attachments });
});

// POST create incident
router.post('/', authenticate, (req, res) => {
  const { title, description, priority = 'MEDIUM', category = 'General', due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const count = db.prepare('SELECT COUNT(*) as c FROM incidents').get().c;
  const number = `INC-${String(count + 1).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const result = db.prepare(`INSERT INTO incidents (number, title, description, status, priority, category, created_by, due_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    number, title, description || '', 'OPEN', priority, category, req.user.id, due_date || null, now, now
  );

  logActivity(req.user.id, 'CREATED_INCIDENT', result.lastInsertRowid, `Created ${number}: ${title}`);

  // Auto-watch creator
  db.prepare('INSERT OR IGNORE INTO watchers (incident_id, user_id) VALUES (?,?)').run(result.lastInsertRowid, req.user.id);

  db.prepare(`INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?,?,?,?,?)`).run(
    req.user.id, 'Incident Created', `Your incident ${number} has been submitted.`, 'success', now
  );

  const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(enrichIncident(inc));
});

// PUT update incident
router.put('/:id', authenticate, (req, res) => {
  const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });

  if (req.user.role === 'USER') return res.status(403).json({ error: 'Users cannot edit incidents' });
  if (req.user.role === 'STAFF' && inc.assigned_to !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const { title, description, status, priority, assigned_to, category, due_date } = req.body;
  const now = new Date().toISOString();

  if (status && status !== inc.status) {
    logActivity(req.user.id, 'UPDATED_STATUS', inc.id, `Status changed from ${inc.status} to ${status}`, inc.status, status);
    notifyWatchers(inc.id, req.user.id, 'Status Updated', `${inc.number} status changed to ${status}`);
  }
  if (priority && priority !== inc.priority) {
    logActivity(req.user.id, 'UPDATED_PRIORITY', inc.id, `Priority changed from ${inc.priority} to ${priority}`, inc.priority, priority);
  }
  if (assigned_to !== undefined && assigned_to !== inc.assigned_to) {
    const staff = assigned_to ? db.prepare('SELECT name FROM users WHERE id=?').get(assigned_to) : null;
    logActivity(req.user.id, 'ASSIGNED_INCIDENT', inc.id, `Assigned to ${staff ? staff.name : 'unassigned'}`, String(inc.assigned_to), String(assigned_to));
    if (assigned_to) {
      db.prepare(`INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (?,?,?,?,?)`).run(
        assigned_to, 'Incident Assigned', `${inc.number} has been assigned to you.`, 'info', now
      );
      db.prepare('INSERT OR IGNORE INTO watchers (incident_id, user_id) VALUES (?,?)').run(inc.id, assigned_to);
    }
  }

  const resolvedAt = (status === 'RESOLVED' || status === 'CLOSED') && !inc.resolved_at ? now : inc.resolved_at;

  db.prepare(`UPDATE incidents SET title=?, description=?, status=?, priority=?, assigned_to=?, category=?, due_date=?, resolved_at=?, updated_at=? WHERE id=?`).run(
    title ?? inc.title, description ?? inc.description, status ?? inc.status, priority ?? inc.priority,
    assigned_to !== undefined ? assigned_to : inc.assigned_to,
    category ?? inc.category, due_date ?? inc.due_date, resolvedAt, now, inc.id
  );

  const updated = db.prepare('SELECT * FROM incidents WHERE id = ?').get(inc.id);
  res.json(enrichIncident(updated));
});

// DELETE incident
router.delete('/:id', authenticate, requireRole('ADMIN'), (req, res) => {
  const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'DELETED_INCIDENT', req.params.id, `Deleted ${inc.number}`);
  res.json({ message: 'Incident deleted' });
});

// POST bulk operations
router.post('/bulk', authenticate, requireRole('ADMIN'), (req, res) => {
  const { ids, action, value } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No incidents selected' });
  const placeholders = ids.map(() => '?').join(',');
  const now = new Date().toISOString();

  if (action === 'delete') {
    db.prepare(`DELETE FROM incidents WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'status') {
    db.prepare(`UPDATE incidents SET status=?, updated_at=? WHERE id IN (${placeholders})`).run(value, now, ...ids);
  } else if (action === 'priority') {
    db.prepare(`UPDATE incidents SET priority=?, updated_at=? WHERE id IN (${placeholders})`).run(value, now, ...ids);
  } else if (action === 'assign') {
    db.prepare(`UPDATE incidents SET assigned_to=?, updated_at=? WHERE id IN (${placeholders})`).run(value, now, ...ids);
  }
  res.json({ message: `Bulk ${action} applied` });
});

// Comments
router.get('/:id/comments', authenticate, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar, u.role as user_role
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.incident_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', authenticate, (req, res) => {
  const { text, parent_id } = req.body;
  if (!text) return res.status(400).json({ error: 'Comment text required' });

  const inc = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!inc) return res.status(404).json({ error: 'Incident not found' });

  const now = new Date().toISOString();
  const result = db.prepare('INSERT INTO comments (incident_id, user_id, text, parent_id, created_at) VALUES (?,?,?,?,?)').run(
    req.params.id, req.user.id, text, parent_id || null, now
  );

  logActivity(req.user.id, 'ADDED_COMMENT', inc.id, `Added comment on ${inc.number}`);
  notifyWatchers(inc.id, req.user.id, 'New Comment', `New comment on ${inc.number}`);
  db.prepare('UPDATE incidents SET updated_at=? WHERE id=?').run(now, inc.id);

  const comment = db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar, u.role as user_role
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

router.put('/:id/comments/:cid', authenticate, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('UPDATE comments SET text=?, updated_at=? WHERE id=?').run(req.body.text, new Date().toISOString(), req.params.cid);
  const updated = db.prepare(`SELECT c.*, u.name as user_name, u.email as user_email FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?`).get(req.params.cid);
  res.json(updated);
});

router.delete('/:id/comments/:cid', authenticate, (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.cid);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.cid);
  res.json({ message: 'Comment deleted' });
});

// Watchers
router.post('/:id/watchers', authenticate, (req, res) => {
  db.prepare('INSERT OR IGNORE INTO watchers (incident_id, user_id) VALUES (?,?)').run(req.params.id, req.user.id);
  res.json({ message: 'Watching' });
});

router.delete('/:id/watchers', authenticate, (req, res) => {
  db.prepare('DELETE FROM watchers WHERE incident_id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ message: 'Unwatched' });
});

module.exports = router;
