const router = require('express').Router();
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  if (req.user.role === 'ADMIN') {
    const totalUsers = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='USER'`).get().c;
    const totalStaff = db.prepare(`SELECT COUNT(*) as c FROM users WHERE role='STAFF'`).get().c;
    const totalIncidents = db.prepare(`SELECT COUNT(*) as c FROM incidents`).get().c;
    const openIncidents = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status='OPEN'`).get().c;
    const inProgress = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status='IN_PROGRESS'`).get().c;
    const resolvedToday = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status IN ('RESOLVED','CLOSED') AND date(updated_at)=date('now')`).get().c;
    const highPriority = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE priority IN ('CRITICAL','HIGH') AND status NOT IN ('RESOLVED','CLOSED')`).get().c;

    const statusDist = db.prepare(`SELECT status, COUNT(*) as count FROM incidents GROUP BY status`).all();
    const priorityDist = db.prepare(`SELECT priority, COUNT(*) as count FROM incidents GROUP BY priority`).all();

    // Trend last 30 days
    const trend = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM incidents WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at) ORDER BY date ASC
    `).all();

    // Staff performance
    const staffPerf = db.prepare(`
      SELECT u.name, u.id,
        COUNT(i.id) as total,
        SUM(CASE WHEN i.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN i.status NOT IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) as open
      FROM users u LEFT JOIN incidents i ON i.assigned_to = u.id
      WHERE u.role = 'STAFF' GROUP BY u.id ORDER BY resolved DESC LIMIT 10
    `).all();

    // Recent activity
    const activity = db.prepare(`
      SELECT a.*, u.name as user_name, u.avatar as user_avatar
      FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC LIMIT 20
    `).all();

    return res.json({ totalUsers, totalStaff, totalIncidents, openIncidents, inProgress, resolvedToday, highPriority, statusDist, priorityDist, trend, staffPerf, activity });
  }

  if (req.user.role === 'STAFF') {
    const assigned = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to=? AND status NOT IN ('RESOLVED','CLOSED')`).get(req.user.id).c;
    const resolvedWeek = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to=? AND status IN ('RESOLVED','CLOSED') AND updated_at >= datetime('now','-7 days')`).get(req.user.id).c;
    const total = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE assigned_to=?`).get(req.user.id).c;
    const statusDist = db.prepare(`SELECT status, COUNT(*) as count FROM incidents WHERE assigned_to=? GROUP BY status`).all(req.user.id);
    const recent = db.prepare(`SELECT * FROM incidents WHERE assigned_to=? ORDER BY updated_at DESC LIMIT 5`).all(req.user.id);
    return res.json({ assigned, resolvedWeek, total, sla: 87, statusDist, recent });
  }

  // USER
  const myTotal = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE created_by=?`).get(req.user.id).c;
  const myOpen = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE created_by=? AND status='OPEN'`).get(req.user.id).c;
  const myResolved = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE created_by=? AND status IN ('RESOLVED','CLOSED')`).get(req.user.id).c;
  const recent = db.prepare(`SELECT * FROM incidents WHERE created_by=? ORDER BY created_at DESC LIMIT 5`).all(req.user.id);
  res.json({ myTotal, myOpen, myResolved, recent });
});

router.get('/reports/volume', authenticate, requireRole('ADMIN'), (req, res) => {
  const { days = 30 } = req.query;
  const data = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count, priority
    FROM incidents WHERE created_at >= datetime('now', '-${parseInt(days)} days')
    GROUP BY date(created_at), priority ORDER BY date ASC
  `).all();
  res.json(data);
});

router.get('/reports/staff-performance', authenticate, requireRole('ADMIN'), (req, res) => {
  const data = db.prepare(`
    SELECT u.id, u.name, u.email,
      COUNT(i.id) as total_assigned,
      SUM(CASE WHEN i.status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN i.status = 'OPEN' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN i.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress
    FROM users u LEFT JOIN incidents i ON i.assigned_to = u.id
    WHERE u.role = 'STAFF' GROUP BY u.id ORDER BY resolved DESC
  `).all();
  res.json(data);
});

router.get('/reports/sla', authenticate, requireRole('ADMIN'), (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as c FROM incidents`).get().c;
  const resolved = db.prepare(`SELECT COUNT(*) as c FROM incidents WHERE status IN ('RESOLVED','CLOSED')`).get().c;
  const byPriority = db.prepare(`SELECT priority, COUNT(*) as total, SUM(CASE WHEN status IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END) as resolved FROM incidents GROUP BY priority`).all();
  res.json({ total, resolved, compliance: total > 0 ? Math.round((resolved / total) * 100) : 0, byPriority });
});

module.exports = router;
