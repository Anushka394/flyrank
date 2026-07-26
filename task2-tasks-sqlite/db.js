const { DatabaseSync } = require('node:sqlite');

const raw = new DatabaseSync('tasks.db');

// Stage 0: create the table if it doesn't already exist
raw.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done  BOOLEAN NOT NULL DEFAULT 0
  )
`);

// Stage 0: insert three example tasks only if the table is empty
const { count } = raw.prepare('SELECT COUNT(*) AS count FROM tasks').get();
if (count === 0) {
  const insert = raw.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)');
  insert.run('Buy milk', 0);
  insert.run('Walk the dog', 0);
  insert.run('Finish assignment', 1);
  console.log('Seeded 3 example tasks (first run only).');
}

// Thin wrapper so server.js's calls read the same regardless of which
// SQLite library sits underneath.
const db = {
  prepare(sql) {
    const stmt = raw.prepare(sql);
    return {
      get: (...args) => stmt.get(...args),
      all: (...args) => stmt.all(...args),
      run: (...args) => {
        const info = stmt.run(...args);
        return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
      }
    };
  }
};

module.exports = db;
