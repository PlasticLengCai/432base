/**
 * CAB432 A01 — REST API project (Video Transcoding)
 * Primary interface: REST API
 * Features: JWT login (hard-coded users), upload, list, transcode (CPU intensive), download,
 *           external API (YouTube/TMDB/Pixabay), web client, load testing script
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const { authRouter } = require('./routes/auth');
const { filesRouter } = require('./routes/files');
const { externalRouter } = require('./routes/external');
const { authRequired } = require('./middleware/auth');
const { ensureDb } = require('./services/db');

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

app.use('/api/auth', authRouter);
app.use('/api', authRequired, filesRouter);        // protect files endpoints
app.use('/api/external', authRequired, externalRouter); // protect external API endpoints

// 404 + error handler
app.use((req,res)=> res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next)=>{
  console.error('ERROR:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Ensure data dirs & db
ensureDb();

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
