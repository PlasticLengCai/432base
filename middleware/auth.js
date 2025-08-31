const jwt = require('jsonwebtoken');

// Hard-coded users (acceptable for A01). In A02 you'll move to a cloud IdP.
const users = [
  { id: 'u1', username: 'alice', password: 'alice123', role: 'user' },
  { id: 'u2', username: 'bob', password: 'bob123', role: 'admin' }
];

function login(username, password) {
  const found = users.find(u => u.username === username && u.password === password);
  if (!found) return null;
  const token = jwt.sign(
    { sub: found.id, username: found.username, role: found.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '12h' }
  );
  return { token, user: { id: found.id, username: found.username, role: found.role } };
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  if (!token) return res.status(401).json({ error: 'Missing Bearer token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

module.exports = { users, login, authRequired, adminOnly };