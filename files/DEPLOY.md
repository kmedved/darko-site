# DARKO Site — Deploy Guide

Your database is already set up on Supabase. This is just the frontend.

---

## Step 1: Install Node.js (if you haven't)

Go to https://nodejs.org — download the LTS version (big green button). Install it.

Open a NEW terminal and confirm it works:

```
node --version
```

---

## Step 2: Put the files in a folder

Create this folder structure with the files I gave you:

```
C:\Users\kmedv\Documents\darko-site\
├── package.json
├── svelte.config.js
├── vite.config.js
├── vercel.json
└── src\
    ├── app.html
    ├── app.css
    ├── lib\
    │   ├── supabase.js
    │   └── components\
    │       ├── PlayerSearch.svelte
    │       ├── PlayerCard.svelte
    │       └── DpmChart.svelte
    └── routes\
        ├── +layout.svelte
        ├── +page.svelte
        └── compare\
            └── +page.svelte
```

---

## Step 3: Test locally

Open terminal:

```
cd C:\Users\kmedv\Documents\darko-site
npm install
npm run dev
```

Go to http://localhost:5173 in your browser. You should see the DPM leaderboard with real data from Supabase.

---

## Step 4: Push to GitHub

```
cd C:\Users\kmedv\Documents\darko-site
git init
git add .
git commit -m "initial commit"
git branch -M main
```

Go to https://github.com → + → New repository → name it `darko-site` → Create.

```
git remote add origin https://github.com/YOUR_USERNAME/darko-site.git
git push -u origin main
```

---

## Step 5: Deploy to Vercel

1. Go to https://vercel.com → Sign up with GitHub
2. Click **Add New** → **Project**
3. Find `darko-site` → **Import**
4. Framework preset should say SvelteKit. If not, select it.
5. Click **Deploy**
6. Wait ~1 minute

Your site is live. Vercel gives you a URL like `https://darko-site.vercel.app`.

---

## Step 6: Custom domain (optional)

In Vercel → Settings → Domains → add your domain → update DNS where you registered it.

---

## Updating

Change files → then:

```
git add .
git commit -m "what you changed"
git push
```

Vercel auto-redeploys in ~30 seconds. No backend to touch.
