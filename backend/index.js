// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

const shortUrls = new Map();


app.post('/shorturls', (req, res) => {
  const { url, validity = 60, shortcode } = req.body;

  if (!url || !/^https?:\/\/.+$/.test(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL.' });
  }

  const code = shortcode || Math.random().toString(36).substring(7);
  const createdAt = new Date();
  const expiry = new Date(createdAt.getTime() + validity * 60000); // validity in minutes

  shortUrls.set(code, {
    url,
    validity,
    shortcode: code,
    createdAt,
    expiry,
    clicks: []
  });

  res.status(201).json({
    shortLink: `http://localhost:${port}/shorturls/${code}`,
    expiry: expiry.toISOString()
  });
});

// Redirect and track click
// Redirect and track click
app.get('/s/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const record = shortUrls.get(shortcode);

  if (!record) return res.status(404).json({ error: 'Shortcode not found' });
  if (new Date() > record.expiry) return res.status(410).json({ error: 'Link expired' });

  // Add click metadata
  record.clicks.push({
    timestamp: new Date().toISOString(),
    source: req.get('referer') || 'unknown',
    user_agent: req.get('user-agent') || 'unknown',
    location: 'Unknown'
  });

  res.redirect(record.url);
});


// Get statistics - GET /shorturls/:shortcode
app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const record = shortUrls.get(shortcode);

  if (!record) return res.status(404).json({ error: 'Shortcode not found' });

  res.json({
    shortcode: record.shortcode,
    original_url: record.url,
    created_at: record.createdAt.toISOString(),
    expiry: record.expiry.toISOString(),
    click_count: record.clicks.length,
    click_details: record.clicks
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
