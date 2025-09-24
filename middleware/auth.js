require('dotenv').config();
const { createRemoteJWKSet, jwtVerify } = require('jose');

const {
  COGNITO_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_APP_CLIENT_ID
} = process.env;

if (!COGNITO_REGION || !COGNITO_USER_POOL_ID || !COGNITO_APP_CLIENT_ID) {
  throw new Error('Missing required Cognito envs for JWT verification');
}

const JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = auth.slice('Bearer '.length).trim();

    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      // aud 必须是你的 App Client ID
      audience: COGNITO_APP_CLIENT_ID,
      // iss 必须是你的 UserPool 的 issuer
      issuer: `https://cognito-idp.${ap-southeast-2}.amazonaws.com/${as2-n12005371}`,
    });

    if (payload.token_use !== 'id') {
      return res.status(401).json({ error: 'Invalid token_use, expected id token' });
    }

    req.user = {
      sub: payload.sub,
      username: payload['cognito:username'],
      email: payload.email,
      groups: payload['cognito:groups'] || [],
      raw: payload
    };
    next();
  } catch (err) {
    console.error('JWT verify failed:', err?.message || err);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function adminOnly(req, res, next) {
  const groups = req.user?.groups || [];
  if (!groups.includes('admin')) {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}

module.exports = {
  authRequired,
  adminOnly,
};
