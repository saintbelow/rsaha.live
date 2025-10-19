**Project Snapshot**
- Next.js 15 app-router project; the only routed surface today is `src/app/page.tsx` which is a client component rendering the animated globe.
- React 19 + TypeScript strict mode; path alias `@/*` (see `tsconfig.json`) is the expected way to import within `src`.
- Dev and build use Turbopack (`npm run dev`, `npm run build`); lint with `npm run lint` (Flat config extending `next/core-web-vitals`).
- Tailwind CSS v4 is wired through `postcss.config.mjs`; global tokens live in `src/app/globals.css` with `@theme` definitions for light/dark.

**Key Components & Patterns**
- `src/components/globe.tsx` owns the hero animation: a single canvas with ASCII globe rendering, starfield, zoom easing, and responsive sizing.
- Keep globe logic performant: it pre-renders to an offscreen canvas, clamps zoom via `minZoom`/`maxZoom`, and throttles globe redraws to ~30fps while stars animate every frame.
- DOM access, event listeners, and requestAnimationFrame loops require "use client"; mirror the existing effect cleanup (wheel/resize listeners + `cancelAnimationFrame`).
- UI primitives live under `src/components/ui/`; `Button` uses `class-variance-authority` variants and the shared `cn` helper from `src/lib/utils.ts`.
- Theme support comes from `ThemeProvider` (wrapping `next-themes`) and `ModeToggle` which relies on that provider; wire new theme-aware controls the same way.

**Styling & Assets**
- Tailwind utilities are available globally; prefer composing classes over inline styles unless canvas APIs demand manual styling.
- Color, radius, and typography tokens are defined once in `globals.css`; extend the existing CSS variables instead of hard-coding new values.
- Icons come from `lucide-react`; match the button/icon sizing pattern (`h-[1.2rem] w-[1.2rem]`) when adding new controls.

**Development Workflow**
- `npm run dev` launches on http://localhost:3000; the page hot-reloads but remember the globe effect initializes per render, so preserve stable refs when possible.
- Use `npm run lint` before commits; ESLint already ignores `.next`, build artifacts, and `next-env.d.ts`.
- No automated tests yet; exercise features manually in multiple viewport sizes because the globe logic branches for mobile/tablet/desktop.

**Implementation Guidance**
- When touching `globe.tsx`, maintain the separation between star updates (`drawStars`) and globe redraw cadence; avoid heavy work inside the per-frame loop.
- Respect the computed center/zoom bounds so the globe stays on screen across breakpoints; extend calculations instead of replacing constants blindly.
- New interactive components should treat dark mode as the default (layout sets `defaultTheme="dark"`) and rely on `ThemeProvider` context.
- Dependencies `liquid-glass-react` and `react-globe.gl` are installed but unused; confirm with the team before removing or introducing alternative globe renderers.
- For new routes, add app router segments under `src/app/**`; server components by default, opt into client only when hooks or browser APIs are required.
