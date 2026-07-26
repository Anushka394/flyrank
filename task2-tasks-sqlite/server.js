const http = require('http');
const db = require('./db');

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean); // e.g. ['tasks', '3']

  try {
    // GET /tasks  and GET /tasks?done=true&search=milk (optional extras)
    if (req.method === 'GET' && parts.length === 1 && parts[0] === 'tasks') {
      let sql = 'SELECT * FROM tasks';
      const clauses = [];
      const params = [];

      const doneParam = url.searchParams.get('done');
      if (doneParam !== null) {
        clauses.push('done = ?');
        params.push(doneParam === 'true' ? 1 : 0);
      }

      const search = url.searchParams.get('search');
      if (search) {
        clauses.push('title LIKE ?');
        params.push(`%${search}%`);
      }

      if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
      sql += ' ORDER BY id';

      const tasks = db.prepare(sql).all(...params);
      return sendJson(res, 200, tasks);
    }

    // GET /tasks/:id
    if (req.method === 'GET' && parts.length === 2 && parts[0] === 'tasks') {
      const id = Number(parts[1]);
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!task) return sendJson(res, 404, { error: 'Task not found' });
      return sendJson(res, 200, task);
    }

    // GET /stats (optional extra)
    if (req.method === 'GET' && parts.length === 1 && parts[0] === 'stats') {
      const total = db.prepare('SELECT COUNT(*) AS count FROM tasks').get().count;
      const done = db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE done = 1').get().count;
      return sendJson(res, 200, { total, done, remaining: total - done });
    }

    // POST /tasks
    if (req.method === 'POST' && parts.length === 1 && parts[0] === 'tasks') {
      const body = await readBody(req);
      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        return sendJson(res, 400, { error: 'title is required' });
      }
      const done = body.done ? 1 : 0;
      const result = db.prepare('INSERT INTO tasks (title, done) VALUES (?, ?)').run(body.title, done);
      const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(res, 201, created);
    }

    // PUT /tasks/:id
    if (req.method === 'PUT' && parts.length === 2 && parts[0] === 'tasks') {
      const id = Number(parts[1]);
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Task not found' });

      const body = await readBody(req);
      const title = body.title !== undefined ? body.title : existing.title;
      const done = body.done !== undefined ? (body.done ? 1 : 0) : existing.done;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return sendJson(res, 400, { error: 'title is required' });
      }

      db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(title, done, id);
      const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      return sendJson(res, 200, updated);
    }

    // DELETE /tasks/:id
    if (req.method === 'DELETE' && parts.length === 2 && parts[0] === 'tasks') {
      const id = Number(parts[1]);
      const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
      if (!existing) return sendJson(res, 404, { error: 'Task not found' });

      db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
      return sendJson(res, 200, { deleted: id });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    return sendJson(res, 400, { error: 'Invalid request', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
