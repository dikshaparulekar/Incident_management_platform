const router = require('express').Router();
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).c;
  res.json({ notifications, unread });
});

router.put('/:id/read', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Marked as read' });
});

router.put('/read-all', authenticate, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'All marked as read' });
});

router.delete('/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
