# Larder

A family recipe box, meal planner, and grocery list. This is the
self-hosted version — no Claude account needed for anyone who uses it,
just a link and (optionally) a shared household passcode.

It's one small Node.js server with everything built in: recipe storage,
taste profiles per person, a weekly meal plan, a grocery list that combines
duplicate ingredients and groups them by aisle, ratings, and (optionally)
AI-powered recipe import and "photo of a restaurant dish → recipe".
Everyone who opens the link sees the same live data — no separate accounts,
no per-person sign-up.

## How it works

- **One server, one data file.** `server.js` is a plain Express app. All
  your data lives in `data/data.json` on whatever machine or host runs it.
- **No accounts.** Optionally set `HOUSEHOLD_PASSCODE` so only people who
  know it can open the app — everyone who knows it shares full access
  (there's no per-person login, just like a shared kitchen whiteboard).
- **Live sync.** Family members on different phones/laptops see each
  other's changes appear automatically (checking off a grocery item, adding
  a recipe, filling in the meal plan) — no refresh needed.
- **AI features are optional.** Import-from-text and Snap-to-Recipe both
  need an Anthropic API key. If you set one (`ANTHROPIC_API_KEY`), every
  family member gets those features for free on your dime — nobody else
  needs their own key or a Claude account. If you skip it, the rest of the
  app works fine; those two buttons just stay disabled with an explanation.
- **Can't fetch web pages itself.** Same limitation as before: paste the
  recipe text or social caption in rather than pasting just a link — the
  app has no way to visit a URL on its own.

## Run it locally first (2 minutes)

Do this before deploying anywhere, just to see it work:

```
npm install
cp .env.example .env
# edit .env: set HOUSEHOLD_PASSCODE to something, leave ANTHROPIC_API_KEY blank for now
npm start
```

Open `http://localhost:3000`. Enter your passcode, add a taste profile, add
a recipe, put it on the meal plan, check the grocery list. Stop the server
(Ctrl+C) and start it again — your data should still be there, loaded from
`data/data.json`.

## Deploying so your family can actually reach it

You need somewhere that (a) runs Node continuously and (b) keeps
`data/data.json` on a disk that survives restarts. That second part rules
out a lot of "free" hosting — most free web-hosting tiers wipe the
filesystem on every redeploy or idle restart, which would quietly erase
your family's recipes. Two options that hold up:

### Option A — Railway (recommended, ~$5/month)

Railway's free trial credit runs out fast for an always-on app, so budget
for their Hobby plan: **$5/month**, which includes a persistent volume (the
disk your `data.json` needs) and enough resources for an app this size with
room to spare. A credit card is required to subscribe.

1. Push this folder to a GitHub repo (or use Railway's CLI to deploy
   straight from your machine — `railway up` from inside this folder works
   without GitHub).
2. On [railway.com](https://railway.com), create a new project from that
   repo (or run `railway up`).
3. In the service's **Variables** tab, add:
   - `HOUSEHOLD_PASSCODE` — pick something your family can remember.
   - `ANTHROPIC_API_KEY` — optional, only if you want Import/Snap-to-Recipe
     working for everyone.
   - `DATA_DIR` — set to `/data`.
4. In the service's **Volumes** tab, attach a volume mounted at `/data`
   (5 GB is included in the Hobby plan and is *far* more than this app
   needs).
5. Railway builds and deploys automatically (it will detect the
   `Dockerfile`, or just run `npm start` if you don't use Docker). It gives
   you a `*.up.railway.app` URL — that's the link you send your family.
   You can attach a custom domain later if you want something friendlier.

### Option B — self-host on hardware you already own (free)

If you have a home server, NAS, or an always-on Raspberry Pi, this costs
nothing and your family's data never leaves your house:

```
docker build -t larder .
docker run -d --name larder \
  -p 3000:3000 \
  -e HOUSEHOLD_PASSCODE=change-me \
  -e ANTHROPIC_API_KEY= \
  -v larder-data:/data \
  --restart unless-stopped \
  larder
```

Then either port-forward 3000 on your router (simplest, but exposes it to
the whole internet — keep the passcode strong) or, better, put it on a
Tailscale/WireGuard network so only your family's devices can reach it at
all, no passcode required at that point if you'd rather skip it.

### A note on "free" platforms

Render's free web-service tier does **not** support persistent disks — the
filesystem resets on every redeploy and after ~15 minutes of inactivity, so
`data.json` (and everyone's recipes) would periodically vanish. It's fine
for testing the app but not for something your family relies on. If you'd
rather stay fully free and don't have hardware to self-host on, ask and I
can adapt this to use a free hosted database (like Supabase's free
Postgres tier) instead of a local file — that removes the persistent-disk
requirement, at the cost of one more free account to set up.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `HOUSEHOLD_PASSCODE` | recommended | Shared passcode gating the whole app. Leave blank for open access to anyone with the link. |
| `ANTHROPIC_API_KEY` | optional | Enables Import and Snap-to-Recipe for everyone, billed to this one key. Get one at console.anthropic.com. |
| `DATA_DIR` | recommended | Where `data.json` is stored. Point it at a persistent volume in production. |
| `PORT` | no | Defaults to 3000; most hosts set this for you. |
| `SESSION_SECRET` | no | Auto-generated and saved next to your data if you don't set one. Only set this yourself if you want login sessions to survive a full data-volume wipe. |

## Backing up your family's recipes

It's all one file: `data/data.json` (or wherever `DATA_DIR` points). Copy
it somewhere safe occasionally — that's your entire backup.
