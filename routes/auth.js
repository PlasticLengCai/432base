const express = require('express');
const router = express.Router();
const {
  registerUser,
  confirmUser,
  loginUser,
  respondToMfaChallenge,
  decodeIdToken,
  getCognitoMetadata,
} = require('../services/cognito');
const { authRequired } = require('../middleware/auth');

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
    const loginResult = await loginUser({ username, password });

    if (loginResult.challengeName) {
      return res.json({
        challenge: {
          name: loginResult.challengeName,
          session: loginResult.session,
          parameters: loginResult.challengeParameters || {},
          message: loginResult.message,
          username,
        }
      });
    }

    const user = decodeIdToken(loginResult.idToken);
    return res.json({
      token: loginResult.idToken,
      refreshToken: loginResult.refreshToken,
      expiresIn: loginResult.expiresIn,
      user,
    });
    
  } catch (err) {
    const msg = err?.name === 'NotAuthorizedException' ? 'USERNAME_WRONG'
      : (err?.name === 'UserNotConfirmedException' ? 'USER_EMAIL_NOT_VER' : (err?.message || 'LOGIN_FAILED'));
    return res.status(401).json({ error: msg });
  }
});

router.post('/login/mfa', async (req, res) => {
  try {
    const { username, code, session, challengeName } = req.body || {};
    if (!username || !code || !session) {
      return res.status(400).json({ error: 'username, code, session are required' });
    }
    const tokens = await respondToMfaChallenge({ username, code, session, challengeName });
    const user = decodeIdToken(tokens.idToken);
    return res.json({
      token: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user,
    });
  } catch (err) {
    const msg = err?.message || 'MFA_FAILED';
    return res.status(401).json({ error: msg });
  }
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

router.get('/jwks-info', (req, res) => {
  res.json(getCognitoMetadata());
});

module.exports = { authRouter: router };
