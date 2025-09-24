require('dotenv').config();
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');
const crypto = require('crypto');

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
  if (!resp.AuthenticationResult || !resp.AuthenticationResult.IdToken) {
    throw new Error('No IdToken in AuthenticationResult');
  }
  return {
    idToken: resp.AuthenticationResult.IdToken,
    accessToken: resp.AuthenticationResult.AccessToken,
    refreshToken: resp.AuthenticationResult.RefreshToken,
    expiresIn: resp.AuthenticationResult.ExpiresIn
  };
}

module.exports = {
  registerUser,
  confirmUser,
  loginUser,
};
