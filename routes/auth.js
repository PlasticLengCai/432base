const express = require('express');
const router = express.Router();
const { registerUser, confirmUser, loginUser } = require('../services/cognito');

router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    if (!username || !password || !email) {
      return res.status(400).json({ error: 'username, password, email are required' });
    }
    await registerUser({ username, password, email });
    return res.json({ message: 'REGISTER SUCCESS' });
  } catch (err) {
    const msg = err?.name === 'UsernameExistsException' ? 'USER EXISTS' : (err?.message || 'REGISTER FAILED');
    return res.status(400).json({ error: msg });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    const { username, code } = req.body || {};
    if (!username || !code) {
      return res.status(400).json({ error: 'username, code are required' });
    }
    await confirmUser({ username, code });
    return res.json({ message: 'EMAIL SUCCESS' });
  } catch (err) {
    const msg = err?.message || 'Failed to confirm user';
    return res.status(400).json({ error: msg });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username, password are required' });
    }
    const tokens = await loginUser({ username, password });
    return res.json({ token: tokens.idToken, expiresIn: tokens.expiresIn });
  } catch (err) {
    const msg = err?.name === 'NotAuthorizedException' ? 'USERNAME_WRONG'
      : (err?.name === 'UserNotConfirmedException' ? 'USER_EMAIL_NOT_VER' : (err?.message || 'LOGIN_FAILED'));
    return res.status(401).json({ error: msg });
  }
});

module.exports = router;
