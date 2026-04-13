# MedFlow AI Agent

Healthcare automation agent built with GPT-4o + Vercel serverless functions.
Simulates a HighLevel webhook pipeline: tag fires → DND check → reply routing → GPT-4o SMS → voice call.

## Features
- Live chat interface (patients chat with the AI agent directly)
- Webhook simulator (fire HighLevel-style events and watch the pipeline run)
- GPT-4o powered SMS generation
- DND compliance gating
- Intent classification (Book / Stop / Question / Outreach)
- Voice call script generation
- Deployable to Vercel — shareable public URL

---

## Deploy in 5 minutes

### 1. Get a new OpenAI API key
Go to https://platform.openai.com/api-keys and create a new key.
Store it somewhere safe — you will NOT put it in any file.

### 2. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
gh repo create medflow-agent --public --push
```
(or create the repo manually on github.com and push)

### 3. Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Follow the prompts. When asked about settings, accept defaults.

### 4. Add your OpenAI key to Vercel
In the Vercel dashboard:
- Go to your project → Settings → Environment Variables
- Add: OPENAI_API_KEY = your-key-here
- Set environment to: Production, Preview, Development

OR via CLI:
```bash
vercel env add OPENAI_API_KEY
```

### 5. Redeploy
```bash
vercel --prod
```

Your app is now live at https://your-project.vercel.app
Share the URL — anyone can open it and chat with the agent.

---

## Local development

```bash
npm install
cp .env.example .env.local
# edit .env.local and add your OPENAI_API_KEY
vercel dev
```
Open http://localhost:3000

---

## Project structure

```
medflow-agent/
├── api/
│   ├── chat.js        ← GPT-4o chat endpoint (/api/chat)
│   └── webhook.js     ← HighLevel webhook simulator (/api/webhook)
├── public/
│   └── index.html     ← Full frontend (chat + webhook dashboard)
├── .env.example       ← Template for your env vars
├── .gitignore         ← Keeps your API key out of GitHub
├── vercel.json        ← Routing config
└── package.json
```

---

## API endpoints

### POST /api/chat
Chat with the AI agent.
```json
{
  "messages": [
    { "role": "user", "content": "I want to book an appointment" }
  ]
}
```
Returns: `{ reply, intent, usage }`

### POST /api/webhook
Simulate a HighLevel webhook trigger.
```json
{
  "contact_name": "Maria Gonzalez",
  "phone": "+1 (305) 555-0182",
  "tag": "reactivation",
  "reply": "Book",
  "dnd": false
}
```
Returns: full pipeline result with SMS text, voice script, and step-by-step breakdown.

---

## Connecting real HighLevel webhooks

Once deployed, your webhook URL is:
`https://your-project.vercel.app/api/webhook`

In HighLevel:
1. Go to Settings → Integrations → Webhooks
2. Add a new webhook pointing to the URL above
3. Select the trigger events (Tag Added, etc.)
4. Map the fields: contact_name, phone, tag

---

## Tech stack
- Runtime: Node.js 18 (Vercel serverless)
- AI: OpenAI GPT-4o
- Frontend: Vanilla HTML/CSS/JS (no framework needed)
- Hosting: Vercel
- CRM integration: HighLevel webhooks
