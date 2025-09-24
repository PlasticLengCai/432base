//paramater store
require('dotenv').config();
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const {
  AWS_REGION, 
  PARAM_API_BASE_URL,
  PARAM_YT_API_BASE,
  PARAM_TMDB_API_BASE,
  PARAM_PIXABAY_API_BASE,

  SECRET_YT_API_KEY,
  SECRET_TMDB_API_KEY,
  SECRET_TMDB_V4_TOKEN,
  SECRET_PIXABAY_API_KEY,

  SECRET_DB_CREDENTIALS
} = process.env;

const ssm = new SSMClient({ region: AWS_REGION || process.env.COGNITO_REGION });
const secrets = new SecretsManagerClient({ region: AWS_REGION || process.env.COGNITO_REGION });

const state = {

  apiBaseUrl: null,
  ytApiBase: null,
  tmdbApiBase: null,
  pixabayApiBase: null,
  ytApiKey: null,
  tmdbApiKey: null,
  tmdbV4Token: null,
  pixabayApiKey: null,
  db: null,
};

async function getParam(name, withDecryption=false) {
  if (!name) return null;
  const resp = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: withDecryption }));
  return resp?.Parameter?.Value || null;
}

async function getSecret(name) {
  if (!name) return null;
  const resp = await secrets.send(new GetSecretValueCommand({ SecretId: name }));
  if (resp.SecretString) return resp.SecretString;
  if (resp.SecretBinary) return Buffer.from(resp.SecretBinary, 'base64').toString('utf-8');
  return null;
}

async function initConfig() {
  // SSM
  state.apiBaseUrl   = await getParam(PARAM_API_BASE_URL);
  state.ytApiBase    = await getParam(PARAM_YT_API_BASE);
  state.tmdbApiBase  = await getParam(PARAM_TMDB_API_BASE);
  state.pixabayApiBase = await getParam(PARAM_PIXABAY_API_BASE);

  // Secrets
  state.ytApiKey = await getSecret(SECRET_YT_API_KEY);
  state.tmdbApiKey = await getSecret(SECRET_TMDB_API_KEY);
  state.tmdbV4Token = await getSecret(SECRET_TMDB_V4_TOKEN);
  state.pixabayApiKey = await getSecret(SECRET_PIXABAY_API_KEY);

  const dbSecret = await getSecret(SECRET_DB_CREDENTIALS);
  if (dbSecret) {
    try { state.db = JSON.parse(dbSecret); } catch {}
  }

  if (state.ytApiKey) process.env.YT_API_KEY = state.ytApiKey;
  if (state.tmdbApiKey) process.env.TMDB_API_KEY = state.tmdbApiKey;
  if (state.tmdbV4Token) process.env.TMDB_V4_TOKEN = state.tmdbV4Token;
  if (state.pixabayApiKey) process.env.PIXABAY_API_KEY = state.pixabayApiKey;

  if (state.ytApiBase) process.env.YT_API_BASE = state.ytApiBase;
  if (state.tmdbApiBase) process.env.TMDB_API_BASE = state.tmdbApiBase;
  if (state.pixabayApiBase) process.env.PIXABAY_API_BASE = state.pixabayApiBase;
}

function getConfig() {
  return state;
}

module.exports = { initConfig, getConfig };
