const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('ADMIN'), (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/', authenticate, requireRole('ADMIN'), (req, res) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)');
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(req.body)) {
    stmt.run(key, String(value), now);
  }
  res.json({ message: 'Settings saved' });
});

// API Tokens
router.get('/tokens', authenticate, (req, res) => {
  const tokens = db.prepare('SELECT id, name, created_at, last_used FROM api_tokens WHERE user_id = ?').all(req.user.id);
  res.json(tokens);
});

router.post('/tokens', authenticate, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Token name required' });
  const token = require('crypto').randomBytes(32).toString('hex');
  const result = db.prepare('INSERT INTO api_tokens (user_id, name, token, created_at) VALUES (?,?,?,?)').run(req.user.id, name, token, new Date().toISOString());
  res.status(201).json({ id: result.lastInsertRowid, name, token, created_at: new Date().toISOString() });
});

router.delete('/tokens/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Token revoked' });
});

module.exports = router;
