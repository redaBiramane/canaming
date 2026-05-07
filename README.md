# canaming

A modern web application built with **Vite**, **React**, **TypeScript**, **shadcn-ui**, and **Tailwind CSS**.

🌐 **Live demo**: [https://redaBiramane.github.io/canaming/](https://redaBiramane.github.io/canaming/)

---

## Technologies

- [Vite](https://vitejs.dev/) – lightning-fast build tool
- [React 18](https://react.dev/) – UI library
- [TypeScript](https://www.typescriptlang.org/) – static typing
- [shadcn/ui](https://ui.shadcn.com/) – accessible component library
- [Tailwind CSS](https://tailwindcss.com/) – utility-first CSS
- [Supabase](https://supabase.com/) – backend-as-a-service (auth, database)
- [TanStack Query](https://tanstack.com/query) – data fetching & caching

---

## Local development

### Prerequisites

- **Node.js ≥ 20** (use [nvm](https://github.com/nvm-sh/nvm) to manage versions)
- **npm ≥ 9** (comes with Node.js)

### Steps

```sh
# 1. Clone the repository
git clone https://github.com/redaBiramane/canaming.git
cd canaming

# 2. Install dependencies
npm install

# 3. Start the development server (hot-reload on http://localhost:8080)
npm run dev
```

### Other useful commands

| Command | Description |
|---|---|
| `npm run build` | Production build → output in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |

---

## Hosting & deployment

### GitHub Pages (automated – recommended)

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) is included. It automatically builds and deploys the app to GitHub Pages on every push to `main`.

**One-time setup:**

1. Go to your repository on GitHub → **Settings** → **Pages**.
2. Under **Source**, select **GitHub Actions**.
3. Push to `main` (or trigger the workflow manually from the **Actions** tab).
4. Your site will be live at: `https://redaBiramane.github.io/canaming/`

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/redaBiramane/canaming)

1. Import the repository on [Vercel](https://vercel.com/new).
2. Vercel detects Vite automatically.
3. Leave **Build Command** as `npm run build` and **Output Directory** as `dist`.
4. Click **Deploy**.

> **Note:** When deploying to Vercel or Netlify (where the app is served at the root `/`), no extra configuration is needed – `DEPLOY_BASE` defaults to `/`. The `/canaming/` subpath is only set when deploying via the included GitHub Actions workflow.

### Netlify

1. Connect the repository on [Netlify](https://app.netlify.com/).
2. **Build command**: `npm run build`
3. **Publish directory**: `dist`
4. Click **Deploy site**.

---

## Environment variables

If the app uses Supabase, create a `.env` file at the project root (copy from `.env.example` if present):

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> All Vite environment variables must be prefixed with `VITE_` to be exposed to the browser.
> For GitHub Pages, add these as **repository secrets** in Settings → Secrets → Actions, then reference them in the workflow if needed.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `npm install` fails | Make sure you are using **Node.js ≥ 20**. Run `node -v` to check. |
| Blank page on GitHub Pages | Ensure **Settings → Pages → Source** is set to **GitHub Actions**, not a branch. |
| Assets 404 on GitHub Pages | The `base: '/canaming/'` option in `vite.config.ts` handles this automatically for production builds. |
| Supabase calls fail | Double-check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly. |
| Port already in use | Change the port: `npm run dev -- --port 3000` |
