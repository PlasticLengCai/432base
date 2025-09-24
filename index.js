/**
 * CAB432 A01 — REST API project (Video Transcoding)
 * Primary interface: REST API
 * Features: JWT login (hard-coded users), upload, list, transcode (CPU intensive), download,
 *           external API (YouTube/TMDB/Pixabay), web client, load testing script
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { authRouter } = require('./routes/auth');
const { filesRouter } = require('./routes/files');
const { externalRouter } = require('./routes/external');
const { authRequired } = require('./middleware/auth');
const { ensureDb } = require('./services/db');
const { initConfig, getConfig } = require('./services/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 1024 * 1024 * 1024 }, useTempFiles: true })); // up to 1GB via temp files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req,res) => res.redirect('/public/'));
app.get('/api/_ping', (req,res)=> res.send('pong'));
app.get('/api/_health', (req,res)=> res.json({ ok: true, time: new Date().toISOString() }));
app.get('/api/_config', (req, res) => {
  const cfg = getConfig();
  const issuer = process.env.COGNITO_REGION && process.env.COGNITO_USER_POOL_ID
    ? `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`
    : null;
  res.json({
    apiBaseUrl: cfg.apiBaseUrl || null, // Parameter Store: api base shared with frontend
    externalApis: {
      youtube: { base: cfg.ytApiBase || null, keyPresent: Boolean(cfg.ytApiKey) },
      tmdb: { base: cfg.tmdbApiBase || null, keyPresent: Boolean(cfg.tmdbApiKey || cfg.tmdbV4Token) },
      pixabay: { base: cfg.pixabayApiBase || null, keyPresent: Boolean(cfg.pixabayApiKey) },
    },
    secrets: {
      databaseConfigured: Boolean(cfg.db),
    },
    cognito: issuer ? {
      region: process.env.COGNITO_REGION,
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      appClientId: process.env.COGNITO_APP_CLIENT_ID,
      issuer,
      jwksUri: `${issuer}/.well-known/jwks.json`,
    } : null,
  });
});

app.use('/api/auth', authRouter);
app.use('/api', authRequired, filesRouter);        // protect files endpoints
app.use('/api/external', authRequired, externalRouter); // protect external API endpoints

// 404 + error handler
app.use((req,res)=> res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next)=>{
  console.error('ERROR:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

(async () => {
  try {
    await initConfig();
  } catch (e) {
    console.error('Failed to init config from SSM/Secrets:', e);
  }

  ensureDb();

  app.listen(PORT, () => {
    const cfg = getConfig();
    const base = cfg.apiBaseUrl ? cfg.apiBaseUrl : `http://localhost:${PORT}`;
    console.log(`Server listening on ${base}`);
    if (cfg.apiBaseUrl && cfg.apiBaseUrl !== `http://localhost:${PORT}`) {
      console.log('Parameter Store API_BASE_URL loaded:', cfg.apiBaseUrl);
    }
  });
})();
