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

  // Secrets Manager values hold API keys and database credentials
  state.ytApiKey     = await safe(() => getSecret(SECRET_YT_API_KEY), `Secret ${SECRET_YT_API_KEY}`);
  state.tmdbApiKey   = await safe(() => getSecret(SECRET_TMDB_API_KEY), `Secret ${SECRET_TMDB_API_KEY}`);
  state.tmdbV4Token  = await safe(() => getSecret(SECRET_TMDB_V4_TOKEN), `Secret ${SECRET_TMDB_V4_TOKEN}`);
  state.pixabayApiKey = await safe(() => getSecret(SECRET_PIXABAY_API_KEY), `Secret ${SECRET_PIXABAY_API_KEY}`);

  const dbSecret = await safe(() => getSecret(SECRET_DB_CREDENTIALS), `Secret ${SECRET_DB_CREDENTIALS}`);
  if (dbSecret) {
    if (typeof dbSecret === 'string') {
      const trimmed = dbSecret.trim();
      let parsed = null;
      try {
        parsed = JSON.parse(trimmed);
      } catch (err) {
        console.warn('[config] Secret JSON parse failed:', err.message);
        const kvPairs = trimmed.split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .map(line => line.split('=', 2))
          .filter(parts => parts.length === 2)
          .reduce((acc, [key, value]) => {
            acc[key.trim()] = value.trim();
            return acc;
          }, {});
        if (Object.keys(kvPairs).length > 0) {
          parsed = kvPairs;
        } else {
          parsed = { value: trimmed };
        }
      }
      state.db = parsed;
    } else if (typeof dbSecret === 'object') {
      state.db = dbSecret;
    } else {
      state.db = { value: String(dbSecret) };
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
