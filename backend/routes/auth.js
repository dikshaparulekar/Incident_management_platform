const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, details, created_at) VALUES (?,?,?,?,?)`).run(
    user.id, 'LOGGED_IN', 'USER', `User ${user.email} logged in`, new Date().toISOString()
  );

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.post('/register', (req, res) => {
  const { name, email, password, department, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const result = db.prepare(`INSERT INTO users (email, password, name, role, status, department, phone, created_at) VALUES (?,?,?,?,?,?,?,?)`).run(
    email.toLowerCase().trim(), bcrypt.hashSync(password, 10), name, 'USER', 'active', department || null, phone || null, new Date().toISOString()
  );

  const user = db.prepare('SELECT id, email, name, role, status, department, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, user });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, status, department, phone, avatar, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/logout', authenticate, (req, res) => {
  db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, details, created_at) VALUES (?,?,?,?,?)`).run(
    req.user.id, 'LOGGED_OUT', 'USER', `User ${req.user.email} logged out`, new Date().toISOString()
  );
  res.json({ message: 'Logged out' });
});

router.put('/profile', authenticate, (req, res) => {
  const { name, department, phone, avatar } = req.body;
  db.prepare('UPDATE users SET name=?, department=?, phone=?, avatar=? WHERE id=?').run(name, department, phone, avatar, req.user.id);
  const user = db.prepare('SELECT id, email, name, role, status, department, phone, avatar, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ error: 'Current password incorrect' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password updated' });
});

module.exports = router;
