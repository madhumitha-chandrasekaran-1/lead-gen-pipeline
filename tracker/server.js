const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLICKS_FILE = path.join(__dirname, 'clicks.jsonl');
const LOG_FILE = path.join(__dirname, '..', 'outreach_log.jsonl');
const REDIRECT_BASE = 'https://rocketride.org';

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'unknown';
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function findLead(leadId) {
  const records = readJsonl(LOG_FILE);
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].lead_id === leadId) return records[i];
  }
  return null;
}

// Click tracking: logs the click, then redirects to the RocketRide site with
// UTM params identifying which lead and A/B variant drove the click.
app.get('/r/:leadId', (req, res) => {
  const leadId = req.params.leadId;

  const click = {
    leadId,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'] || '',
  };
  fs.appendFile(CLICKS_FILE, JSON.stringify(click) + '\n', (err) => {
    if (err) console.error('Failed to log click:', err);
  });

  const lead = findLead(leadId);
  const utmContent = slugify(lead && lead.company_name);
  const utmTerm = (lead && lead.variant) || 'unknown';

  const redirectUrl =
    `${REDIRECT_BASE}?utm_source=outreach&utm_medium=dm&utm_campaign=signal-scout` +
    `&utm_content=${encodeURIComponent(utmContent)}&utm_term=${encodeURIComponent(utmTerm)}`;

  res.redirect(302, redirectUrl);
});

// Lead logging: the pipeline POSTs each finalized lead here once drafted.
// date_found is stamped server-side; date_sent/replied/signed_up start unset
// and are filled in later via update.js as you work the lead manually.
app.post('/log', (req, res) => {
  const body = req.body || {};
  if (!body.lead_id) {
    return res.status(400).json({ error: 'lead_id is required' });
  }

  const record = {
    lead_id: body.lead_id,
    date_found: new Date().toISOString(),
    company_name: body.company_name || '',
    contact_or_repo_owner: body.contact_or_repo_owner || '',
    signal_type: body.signal_type || '',
    evidence: body.evidence || '',
    fit_score: typeof body.fit_score === 'number' ? body.fit_score : null,
    variant: body.variant || '',
    tracking_url: body.tracking_url || '',
    message_draft: body.message_draft || '',
    date_sent: null,
    replied: null,
    signed_up: null,
  };

  fs.appendFile(LOG_FILE, JSON.stringify(record) + '\n', (err) => {
    if (err) {
      console.error('Failed to log lead:', err);
      return res.status(500).json({ error: 'failed to write log' });
    }
    res.status(201).json({ status: 'logged', lead_id: record.lead_id });
  });
});

app.listen(PORT, () => {
  console.log(`Tracking server listening on http://localhost:${PORT}`);
});
