# Mind

Mind is a local-first personal dashboard for planning your day, tracking study, detailed spending, notes, reminders, and AI assistance.

## Included
- Overview dashboard
- Day planner with time blocks and completion
- Study queue with subject, topic, deadline, priority, duration and status
- Spending ledger with categories, payment method, notes, monthly totals and category breakdown
- Searchable notes with tags
- Reminders and optional browser notifications
- Backup export/import
- Mind AI chat and natural-language quick commands
- Mobile responsive cosmic flat-vector theme
- Local fallback commands even when the hosted AI is not configured

## Data and privacy
Core data is stored in your browser using localStorage. Export backups regularly if the data matters to you.
When full Mind AI is enabled, a compact snapshot of relevant dashboard data is sent to the AI endpoint only when you submit an AI request.

## Netlify deploy
This repository's `mind-app` branch contains a root `netlify.toml` that tells Netlify to use the `mind` folder as the site base.

1. In Netlify: Add new project -> Import an existing project.
2. Choose GitHub and select this repository.
3. Choose the `mind-app` branch.
4. Netlify reads `netlify.toml`; no frontend build command is needed.
5. Publish.

## Enable full Mind AI
In Netlify -> Site configuration -> Environment variables add:

- `OPENAI_API_KEY` = your API key
- `OPENAI_MODEL` = optional model override; default is `gpt-5.6-terra`

Then redeploy. The API key stays server-side in the Netlify Function and is never embedded into the browser code.

Without an API key, Mind still works and includes a small local command parser for basic expense, note and study commands.

## Suggested next upgrades
- Account login + cloud sync
- Recurring reminders
- Calendar sync
- Budget targets and subscriptions
- Exam countdowns, study streaks and spaced repetition
- Receipt import
