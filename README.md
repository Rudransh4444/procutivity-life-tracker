# Local AI Productivity

Simple todo-first Vercel web app with project-based AI help and ActivityWatch site analytics.

## Run locally

```powershell
npm install
npm run dev
```

## Build for Vercel

```powershell
npm run build
```

Vercel config:
- build command: `npm run vercel-build`
- output directory: `dist`

## App features

- Main todo list
- Project grouping and project goals
- AI project expansion into todos
- ActivityWatch site analytics import/view
- Groq-compatible AI settings
- Progress log

## AI setup

Open the AI settings panel in the app and save:
- API URL
- API key
- provider/model

Groq-compatible endpoint example:
- `https://api.groq.com/openai/v1/chat/completions`

## ActivityWatch

- Paste site tracking JSON into the ActivityWatch panel to see top sites.
- Enter host/bucket details if you keep AW data in a proxy or sidecar endpoint.
