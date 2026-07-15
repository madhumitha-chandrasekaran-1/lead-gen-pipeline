#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'outreach_log.jsonl');

const FLAGS = {
  '--sent': 'sent',
  '--replied': 'replied',
  '--signed_up': 'signed_up',
};

function parseArgs(argv) {
  const args = { leadId: null, fields: {} };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token in FLAGS) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) {
        args.fields[FLAGS[token]] = 'true';
      } else {
        args.fields[FLAGS[token]] = value;
        i++;
      }
    } else if (!args.leadId && !token.startsWith('--')) {
      args.leadId = token;
    }
  }
  return args;
}

function toBool(value) {
  return String(value).toLowerCase() === 'true';
}

const { leadId, fields } = parseArgs(process.argv.slice(2));

if (!leadId || Object.keys(fields).length === 0) {
  console.error(
    'Usage: node update.js <lead_id> [--sent true|false] [--replied true|false] [--signed_up true|false]'
  );
  process.exit(1);
}

if (!fs.existsSync(LOG_FILE)) {
  console.error(`No outreach_log.jsonl found at ${LOG_FILE}`);
  process.exit(1);
}

const lines = fs
  .readFileSync(LOG_FILE, 'utf8')
  .split('\n')
  .filter((line) => line.trim());

let matched = false;

const updatedLines = lines.map((line) => {
  let record;
  try {
    record = JSON.parse(line);
  } catch {
    return line; // leave unparseable lines untouched
  }
  if (record.lead_id !== leadId) return JSON.stringify(record);

  matched = true;
  if ('sent' in fields) {
    record.date_sent = toBool(fields.sent) ? new Date().toISOString() : null;
  }
  if ('replied' in fields) {
    record.replied = toBool(fields.replied);
  }
  if ('signed_up' in fields) {
    record.signed_up = toBool(fields.signed_up);
  }
  return JSON.stringify(record);
});

if (!matched) {
  console.error(`No lead found with lead_id "${leadId}" in outreach_log.jsonl`);
  process.exit(1);
}

fs.writeFileSync(LOG_FILE, updatedLines.join('\n') + '\n');
console.log(`Updated lead_id "${leadId}":`, fields);
