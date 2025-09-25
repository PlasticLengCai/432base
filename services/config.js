//paramater store
require('dotenv').config();
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const {
  AWS_REGION, 
  secret_admin_name
} = process.env;

const resolvedRegion = AWS_REGION || process.env.COGNITO_REGION || 'ap-southeast-2';
const ssm = new SSMClient({ region: resolvedRegion });
const secrets = new SecretsManagerClient({ region: resolvedRegion });

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
  const safe = async (fn, label) => {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[config] ${label} unavailable: ${err.message}`);
      return null;
    }
  };

  // Parameter Store values power the frontend + external API endpoints
  state.apiBaseUrl    = await safe(() => getParam(PARAM_API_BASE_URL), `ParameterStore ${PARAM_API_BASE_URL}`);
  state.ytApiBase     = await safe(() => getParam(PARAM_YT_API_BASE), `ParameterStore ${PARAM_YT_API_BASE}`);
  state.tmdbApiBase   = await safe(() => getParam(PARAM_TMDB_API_BASE), `ParameterStore ${PARAM_TMDB_API_BASE}`);
  state.pixabayApiBase = await safe(() => getParam(PARAM_PIXABAY_API_BASE), `ParameterStore ${PARAM_PIXABAY_API_BASE}`);


  const dbSecret = await safe(() => getSecret(secret_admin_name), `Secret ${secret_admin_name}`);
  

  if (dbSecret) {

    try { state.db = JSON.parse(dbSecret); }
    catch (err) {
      console.warn('[config] Failed to parse DB secret JSON:', err.message);
    }
  }

  if (state.ytApiKey) process.env.YT_API_KEY = state.ytApiKey;
  if (state.tmdbApiKey) process.env.TMDB_API_KEY = state.tmdbApiKey;
  if (state.tmdbV4Token) process.env.TMDB_V4_TOKEN = state.tmdbV4Token;
  if (state.pixabayApiKey) process.env.PIXABAY_API_KEY = state.pixabayApiKey;

  if (state.ytApiBase) process.env.YT_API_BASE = state.ytApiBase;
  if (state.tmdbApiBase) process.env.TMDB_API_BASE = state.tmdbApiBase;
  if (state.pixabayApiBase) process.env.PIXABAY_API_BASE = state.pixabayApiBase;

  
  if (state.db && typeof state.db === 'object') {
    Object.entries(state.db).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const envKey = `DB_${String(key).toUpperCase()}`;
      if (process.env[envKey] === undefined) {
        process.env[envKey] = typeof value === 'string' ? value : String(value);
      }
    });
  }
}

function getConfig() {
  return state;
}

module.exports = { initConfig, getConfig };
