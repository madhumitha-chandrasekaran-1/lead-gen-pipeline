# Outreach Tracker

- `GET /r/:leadId` — redirects to the RocketRide site, logging each hit as a line in `clicks.jsonl` and tagging the redirect with `utm_content` (company) and `utm_term` (A/B variant) looked up from `../outreach_log.jsonl`.
- `POST /log` — called automatically by the pipeline to append a finalized lead to `../outreach_log.jsonl`. You shouldn't need to call this yourself.

## Run locally

```
npm install
npm start          # or: node server.js
```

Server listens on `http://localhost:3000`.

## Expose publicly for testing

```
npx ngrok http 3000
```

Use the printed `https://<random>.ngrok-free.app` URL in place of `localhost:3000` in any tracking link you actually send.

## Update a lead's status

As you work leads manually (sending messages, getting replies, seeing signups), record it with `update.js`:

```
node update.js <lead_id> --sent true
node update.js <lead_id> --replied true
node update.js <lead_id> --signed_up true
```

`--sent true` stamps `date_sent` with the current time (`--sent false` clears it back to `null`). `--replied` and `--signed_up` set plain booleans. You can pass more than one flag in a single call.
