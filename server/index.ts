import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Database setup
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'pto.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    accrual_rate REAL DEFAULT 0,
    current_days REAL DEFAULT 0,
    sick_days REAL DEFAULT 0,
    buffer_days REAL DEFAULT 0,
    pay_frequency TEXT DEFAULT 'biweekly',
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pto_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT DEFAULT 'pto',
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS enabled_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recommendation_key TEXT NOT NULL,
    UNIQUE(user_id, recommendation_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Migrate: add buffer_days if missing
try {
  db.exec(`ALTER TABLE user_settings ADD COLUMN buffer_days REAL DEFAULT 0`);
} catch (_) {
  // Column already exists
}

// Auth: simple name-based login
app.post('/api/login', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const trimmed = name.trim();
  let user = db.prepare('SELECT * FROM users WHERE name = ?').get(trimmed) as any;

  if (!user) {
    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(trimmed);
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(result.lastInsertRowid);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }

  res.json({ user });
});

// Get user settings
app.get('/api/users/:id/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.params.id);
  res.json({ settings: settings || {} });
});

// Update user settings
app.put('/api/users/:id/settings', (req, res) => {
  const { accrual_rate, current_days, sick_days, buffer_days, pay_frequency } = req.body;
  db.prepare(`
    INSERT INTO user_settings (user_id, accrual_rate, current_days, sick_days, buffer_days, pay_frequency)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      accrual_rate = excluded.accrual_rate,
      current_days = excluded.current_days,
      sick_days = excluded.sick_days,
      buffer_days = excluded.buffer_days,
      pay_frequency = excluded.pay_frequency
  `).run(req.params.id, accrual_rate, current_days, sick_days, buffer_days || 0, pay_frequency);
  res.json({ success: true });
});

// Get PTO days for a user
app.get('/api/users/:id/days', (req, res) => {
  const days = db.prepare('SELECT * FROM pto_days WHERE user_id = ?').all(req.params.id);
  res.json({ days });
});

// Toggle a PTO day
app.post('/api/users/:id/days', (req, res) => {
  const { date, type } = req.body;
  const existing = db.prepare('SELECT * FROM pto_days WHERE user_id = ? AND date = ?').get(req.params.id, date) as any;

  if (existing) {
    db.prepare('DELETE FROM pto_days WHERE user_id = ? AND date = ?').run(req.params.id, date);
    res.json({ action: 'removed' });
  } else {
    db.prepare('INSERT INTO pto_days (user_id, date, type) VALUES (?, ?, ?)').run(req.params.id, date, type || 'pto');
    res.json({ action: 'added' });
  }
});

// Get enabled recommendations
app.get('/api/users/:id/recommendations', (req, res) => {
  const recs = db.prepare('SELECT recommendation_key FROM enabled_recommendations WHERE user_id = ?').all(req.params.id) as any[];
  res.json({ enabled: recs.map(r => r.recommendation_key) });
});

// Toggle a recommendation
app.post('/api/users/:id/recommendations', (req, res) => {
  const { key, enabled } = req.body;
  if (enabled) {
    db.prepare('INSERT OR IGNORE INTO enabled_recommendations (user_id, recommendation_key) VALUES (?, ?)').run(req.params.id, key);
  } else {
    db.prepare('DELETE FROM enabled_recommendations WHERE user_id = ? AND recommendation_key = ?').run(req.params.id, key);
  }
  res.json({ success: true });
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
