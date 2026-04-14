const bcrypt = require('bcryptjs');
const db = require('../config/database');

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Network', 'Hardware', 'Software', 'Security', 'Access', 'Performance', 'Database', 'General'];
const DEPARTMENTS = ['Engineering', 'IT', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales', 'Support'];

const INCIDENT_TITLES = [
  'Cannot login to dashboard', 'Server returning 502 error', 'Database connection timeout',
  'Email notifications not sending', 'File upload failing', 'API rate limit exceeded',
  'SSL certificate expired', 'Memory leak in production', 'Slow page load times',
  'User permissions not working', 'Report generation failing', 'Search not returning results',
  'Payment processing error', 'Mobile app crashing', 'Data sync issue',
  'Backup job failed', 'High CPU usage on server', 'Disk space critically low',
  'Authentication service down', 'Cache invalidation issue', 'Webhook not triggering',
  'PDF export broken', 'Dashboard charts not loading', 'Session timeout too short',
  'Two-factor auth not working', 'Import CSV failing', 'Audit logs missing entries',
  'Notification bell not updating', 'Dark mode not persisting', 'Keyboard shortcuts broken'
];

const COMMENT_TEXTS = [
  'Looking into this issue now.', 'Can you provide more details?', 'This has been escalated.',
  'Working on a fix.', 'Issue reproduced on staging.', 'Patch deployed to production.',
  'Waiting for vendor response.', 'Root cause identified.', 'Fix verified by QA.',
  'Monitoring for recurrence.', 'User confirmed resolution.', 'Closing as resolved.',
  'Need more information from the user.', 'This is a known issue, workaround available.',
  'Scheduled maintenance will address this.', 'Rolled back the last deployment.',
  'Configuration change applied.', 'Database query optimized.', 'Cache cleared.',
  'Service restarted successfully.'
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

async function seed() {
  const existing = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existing.c > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  console.log('Seeding database...');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Insert admin
  db.prepare(`INSERT INTO users (email, password, name, role, status, department, created_at) VALUES (?,?,?,?,?,?,?)`).run(
    'admin@uimp.com', hash('admin123'), 'Admin User', 'ADMIN', 'active', 'IT', daysAgo(90)
  );

  // Insert 30 staff
  const staffNames = ['Alice Johnson','Bob Smith','Carol White','David Brown','Eva Martinez',
    'Frank Wilson','Grace Lee','Henry Taylor','Iris Anderson','Jack Thomas',
    'Karen Jackson','Liam Harris','Mia Martin','Noah Thompson','Olivia Garcia',
    'Paul Martinez','Quinn Robinson','Rachel Clark','Sam Rodriguez','Tina Lewis',
    'Uma Lee','Victor Walker','Wendy Hall','Xavier Allen','Yara Young',
    'Zach King','Amy Wright','Brian Scott','Cathy Green','Derek Adams'];

  for (let i = 1; i <= 30; i++) {
    db.prepare(`INSERT INTO users (email, password, name, role, status, department, created_at) VALUES (?,?,?,?,?,?,?)`).run(
      `staff${i}@uimp.com`, hash('staff123'), staffNames[i-1], 'STAFF', 'active', randomItem(DEPARTMENTS), daysAgo(randomInt(30, 80))
    );
  }

  // Insert 300 users
  const firstNames = ['James','Mary','John','Patricia','Robert','Jennifer','Michael','Linda','William','Barbara',
    'David','Susan','Richard','Jessica','Joseph','Sarah','Thomas','Karen','Charles','Lisa',
    'Christopher','Nancy','Daniel','Betty','Matthew','Margaret','Anthony','Sandra','Mark','Ashley'];
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Moore',
    'Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Young','King'];

  for (let i = 1; i <= 300; i++) {
    const fn = firstNames[(i-1) % firstNames.length];
    const ln = lastNames[Math.floor((i-1) / firstNames.length) % lastNames.length];
    db.prepare(`INSERT INTO users (email, password, name, role, status, department, created_at) VALUES (?,?,?,?,?,?,?)`).run(
      `user${i}@uimp.com`, hash('user123'), `${fn} ${ln}`, 'USER', randomItem(['active','active','active','inactive']),
      randomItem(DEPARTMENTS), daysAgo(randomInt(1, 60))
    );
  }

  console.log('Users seeded: 1 admin, 30 staff, 300 users');

  // Get user IDs
  const allUsers = db.prepare('SELECT id, role FROM users').all();
  const adminId = allUsers.find(u => u.role === 'ADMIN').id;
  const staffIds = allUsers.filter(u => u.role === 'STAFF').map(u => u.id);
  const userIds = allUsers.filter(u => u.role === 'USER').map(u => u.id);

  // Status distribution: 60 OPEN, 40 IN_PROGRESS, 70 RESOLVED, 30 CLOSED
  const statusPool = [
    ...Array(60).fill('OPEN'),
    ...Array(40).fill('IN_PROGRESS'),
    ...Array(70).fill('RESOLVED'),
    ...Array(30).fill('CLOSED')
  ];
  // Priority distribution: 20 CRITICAL, 40 HIGH, 80 MEDIUM, 60 LOW
  const priorityPool = [
    ...Array(20).fill('CRITICAL'),
    ...Array(40).fill('HIGH'),
    ...Array(80).fill('MEDIUM'),
    ...Array(60).fill('LOW')
  ];

  // Shuffle
  for (let i = statusPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
  }
  for (let i = priorityPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [priorityPool[i], priorityPool[j]] = [priorityPool[j], priorityPool[i]];
  }

  const insertIncident = db.prepare(`
    INSERT INTO incidents (number, title, description, status, priority, category, created_by, assigned_to, resolved_at, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);

  const incidentIds = [];
  for (let i = 1; i <= 200; i++) {
    const status = statusPool[i-1];
    const priority = priorityPool[i-1];
    const createdAt = daysAgo(randomInt(0, 29));
    const updatedAt = daysAgo(randomInt(0, Math.min(5, 29)));
    const resolvedAt = (status === 'RESOLVED' || status === 'CLOSED') ? daysAgo(randomInt(0, 5)) : null;
    const assignedTo = randomItem([...staffIds, null, null]);
    const title = INCIDENT_TITLES[i % INCIDENT_TITLES.length] + (i > INCIDENT_TITLES.length ? ` #${i}` : '');

    const result = insertIncident.run(
      `INC-${String(i).padStart(3,'0')}`,
      title,
      `Detailed description for incident ${i}. Users are experiencing issues with ${title.toLowerCase()}. This needs immediate attention.`,
      status, priority,
      randomItem(CATEGORIES),
      randomItem(userIds),
      assignedTo,
      resolvedAt,
      createdAt, updatedAt
    );
    incidentIds.push(result.lastInsertRowid);
  }

  console.log('Incidents seeded: 200');

  // Seed 500 comments
  const insertComment = db.prepare(`INSERT INTO comments (incident_id, user_id, text, created_at) VALUES (?,?,?,?)`);
  let commentCount = 0;
  for (const incId of incidentIds) {
    const numComments = randomInt(2, 5);
    for (let c = 0; c < numComments && commentCount < 500; c++) {
      const userId = randomItem([...staffIds, ...userIds.slice(0, 50)]);
      insertComment.run(incId, userId, randomItem(COMMENT_TEXTS), daysAgo(randomInt(0, 10)));
      commentCount++;
    }
    if (commentCount >= 500) break;
  }

  console.log(`Comments seeded: ${commentCount}`);

  // Seed 1000 activity logs
  const insertLog = db.prepare(`INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, created_at) VALUES (?,?,?,?,?,?)`);
  const actions = ['CREATED_INCIDENT','UPDATED_STATUS','ASSIGNED_INCIDENT','ADDED_COMMENT','RESOLVED_INCIDENT','CLOSED_INCIDENT','UPDATED_PRIORITY','LOGGED_IN','LOGGED_OUT'];

  for (let i = 0; i < 1000; i++) {
    const incId = randomItem(incidentIds);
    const userId = randomItem([adminId, ...staffIds, ...userIds.slice(0, 30)]);
    const action = randomItem(actions);
    insertLog.run(userId, action, 'INCIDENT', incId, `${action} on INC-${String(incId).padStart(3,'0')}`, daysAgo(randomInt(0, 29)));
  }

  console.log('Activity logs seeded: 1000');

  // Default settings
  const settings = [
    ['system_name', 'UIMP - Unified Incident Management Platform'],
    ['timezone', 'UTC'],
    ['date_format', 'YYYY-MM-DD'],
    ['session_timeout', '60'],
    ['max_file_size', '10'],
    ['allowed_file_types', 'jpg,png,pdf,doc,docx,xlsx,zip'],
    ['sla_critical', '4'],
    ['sla_high', '8'],
    ['sla_medium', '24'],
    ['sla_low', '72'],
    ['registration_enabled', 'true'],
    ['2fa_required', 'false'],
    ['backup_schedule', 'daily'],
  ];
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)');
  for (const [k, v] of settings) insertSetting.run(k, v);

  console.log('Database seeding complete!');
}

seed().catch(console.error);
