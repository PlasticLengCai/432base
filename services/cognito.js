require('dotenv').config();
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
  COGNITO_REGION,
  COGNITO_USER_POOL_ID,
  COGNITO_APP_CLIENT_ID,
  COGNITO_APP_CLIENT_SECRET
} = process.env;

['COGNITO_REGION','COGNITO_USER_POOL_ID','COGNITO_APP_CLIENT_ID'].forEach((k)=>{
  if(!process.env[k]) {
    throw new Error(`Missing required env: ${k}`);
  }
});

const cognito = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

const CHALLENGE_RESPONSE_MAP = {
  SMS_MFA: 'SMS_MFA_CODE',
  SOFTWARE_TOKEN_MFA: 'SOFTWARE_TOKEN_MFA_CODE',
  EMAIL_OTP: 'EMAIL_OTP_CODE',
  CUSTOM_CHALLENGE: 'ANSWER',
};

function buildTokens(result) {
  if (!result || !result.IdToken) {
    throw new Error('No IdToken in AuthenticationResult');
  }
  return {
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn,
  };
}


function secretHash(username) {
  if (!COGNITO_APP_CLIENT_SECRET) return undefined;
  const hmac = crypto.createHmac('sha256', COGNITO_APP_CLIENT_SECRET);
  hmac.update(username + COGNITO_APP_CLIENT_ID);
  return hmac.digest('base64');
}

async function registerUser({ username, password, email }) {
  const input = {
    ClientId: COGNITO_APP_CLIENT_ID,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: 'email', Value: email }],
  };
  const sh = secretHash(username);
  if (sh) input.SecretHash = sh;

  await cognito.send(new SignUpCommand(input));

  return { ok: true };
}

async function confirmUser({ username, code }) {
  const input = {
    ClientId: COGNITO_APP_CLIENT_ID,
    Username: username,
    ConfirmationCode: code,
  };
  const sh = secretHash(username);
  if (sh) input.SecretHash = sh;

  await cognito.send(new ConfirmSignUpCommand(input));
  return { ok: true };
}

async function loginUser({ username, password }) {
  const AuthParameters = {
    USERNAME: username,
    PASSWORD: password,
  };
  const sh = secretHash(username);
  if (sh) AuthParameters.SECRET_HASH = sh;

  const input = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: COGNITO_APP_CLIENT_ID,
    AuthParameters,
  };

  const resp = await cognito.send(new InitiateAuthCommand(input));
  
  if (resp.ChallengeName) {
    return {
      challengeName: resp.ChallengeName,
      challengeParameters: resp.ChallengeParameters || {},
      session: resp.Session,
      message: buildChallengeMessage(resp.ChallengeName),
    };
  }

  return buildTokens(resp.AuthenticationResult);
}

function buildChallengeMessage(name) {
  switch (name) {
    case 'SMS_MFA':
      return 'Multi-factor authentication required (check SMS).';
    case 'SOFTWARE_TOKEN_MFA':
      return 'Enter the TOTP from your authenticator application.';
    case 'EMAIL_OTP':
      return 'Check your email for the verification code and submit it below.';
    case 'NEW_PASSWORD_REQUIRED':
      return 'A new password is required before login can continue.';
    default:
      return 'Additional authentication challenge required.';
  }
}

async function respondToMfaChallenge({ username, code, session, challengeName }) {
  const name = challengeName || 'SOFTWARE_TOKEN_MFA';
  const challengeKey = CHALLENGE_RESPONSE_MAP[name] || 'ANSWER';

  const ChallengeResponses = {
    USERNAME: username,
  };
  if (challengeKey === 'ANSWER') {
    ChallengeResponses.ANSWER = code;
  } else {
    ChallengeResponses[challengeKey] = code;
  }

  const sh = secretHash(username);
  if (sh) ChallengeResponses.SECRET_HASH = sh;

  const input = {
    ChallengeName: name,
    ClientId: COGNITO_APP_CLIENT_ID,
    Session: session,
    ChallengeResponses,
  };

  const resp = await cognito.send(new RespondToAuthChallengeCommand(input));

  if (resp.ChallengeName) {
    throw new Error(`Additional challenge returned: ${resp.ChallengeName}`);
  }
  
  return buildTokens(resp.AuthenticationResult);
}

function decodeIdToken(token) {
  if (!token) return null;
  const decoded = jwt.decode(token) || {};
  return {
    username: decoded['cognito:username'] || decoded.username || null,
    email: decoded.email || null,
    sub: decoded.sub || null,
    groups: decoded['cognito:groups'] || [],
    issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
    expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
  };
}

function getCognitoMetadata() {
  const issuer = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;
  return {
    region: COGNITO_REGION,
    userPoolId: COGNITO_USER_POOL_ID,
    appClientId: COGNITO_APP_CLIENT_ID,
    issuer,
    jwksUri: `${issuer}/.well-known/jwks.json`,
  };
}

module.exports = {
  registerUser,
  confirmUser,
  loginUser,
  respondToMfaChallenge,
  decodeIdToken,
  getCognitoMetadata,
};
