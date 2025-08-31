
const express = require('express');
const { login } = require('../middleware/auth');
const router = express.Router();

router.post('/login', (req,res)=>{
  const { username, password } = req.body || {};
  const result = login(username, password);
  if (!result) return res.status(401).json({ error: 'Invalid credentials' });
  res.json(result);
});

module.exports = { authRouter: router };
