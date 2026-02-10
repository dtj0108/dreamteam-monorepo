# Hero Section Visual Documentation

Reference documentation for the hero section on the DreamTeam user-web site.

**Source**: `apps/user-web/src/components/shadcn-studio/blocks/hero-section-25/hero-section-25.tsx`

---

## Layout

- Full-width `<section>` with responsive vertical padding: `py-8` (mobile) / `py-16` (tablet) / `py-24` (desktop)
- Max-width `7xl` container, centered with `mx-auto`
- Content stacked vertically with responsive gaps: `gap-8` / `gap-16` / `gap-24`
- Horizontal padding: `px-4` / `px-6` / `px-8`

---

## Hero Content (top half)

All content is center-aligned (`text-center`, `items-center`).

### Badge

- Outline-variant `<Badge>` reading **"Introducing AI Agents"**
- `text-sm font-normal`

### Headline

```
Add AI Agents that work autonomously
in minutes
```

- Scales: `text-2xl` (mobile) &rarr; `text-3xl` (sm) &rarr; `text-5xl` (lg)
- Weight: `font-semibold` at small sizes, `font-bold` at lg
- **"in minutes"** has `underline underline-offset-3`
- Line break (`<br />`) between the two lines

### Subheadline

```
Set them up once, they work forever.
While you do, whatever.
```

- `text-xl`, `text-muted-foreground` (gray), `max-w-4xl`
- Line break between the two sentences

### CTA Buttons

Two buttons, wrapped with `gap-4`:

| Button | Label | Style | Link |
|--------|-------|-------|------|
| Secondary | Explore Workspace | `color="secondary"`, `size="xl"` (gray) | `/demo/crm` |
| Primary | Deploy Agents | `size="xl"`, `bg-blue-600 hover:bg-blue-700` | `/pricing` |

Order in DOM: "Explore Workspace" first (left), "Deploy Agents" second (right).

---

## Live Agent Work Lanes (bottom half)

The interactive demo card showing 6 AI agents working in real time.

### Outer Container

- Max-width `6xl`, centered
- **3D perspective tilt** on desktop: `perspective(2000px) rotateX(4deg)` at rest, `rotateX(0deg)` on hover
- Transition: `duration-700`
- Only applies at `md:` breakpoint and above

### Card Frame

- `rounded-xl`, `border border-zinc-800`, `bg-zinc-950`, `shadow-2xl`
- `overflow-hidden` to clip the border beam

### BorderBeam Animation

An animated gradient dot that travels around the card border in a continuous loop.

- **Colors**: `#3b82f6` (blue-500) &rarr; `#10b981` (emerald-500)
- **Duration**: 8 seconds per loop
- **Size**: 80px diameter gradient dot
- **Mechanism**: CSS `offset-path` with Framer Motion animating `offsetDistance` from 0% to 100%
- **Source**: `apps/user-web/src/components/ui/border-beam.tsx`

### Header Bar

Top bar separated by `border-b border-zinc-800`, `px-4 py-2.5`.

| Left side | Right side |
|-----------|------------|
| Emerald pulsing dot (`size-2 animate-pulse bg-emerald-500`) | Red pulsing dot (`size-2 animate-pulse bg-red-500`) |
| "6 agents working" (`text-sm text-zinc-300`) | "LIVE" badge (`border-red-500/30 bg-red-500/10 text-red-400`) |

### Agent Card Grid

Padding: `p-3` (mobile) / `p-4` (sm+).

| Breakpoint | Layout | Agents shown |
|------------|--------|--------------|
| Desktop (`lg:`) | 3-column grid, `gap-3` | All 6 |
| Tablet (`md:` to `lg:`) | 2-column grid, `gap-3` | First 4 |
| Mobile (`< md:`) | Single card carousel | 1 at a time, cycling |

Mobile carousel cycles every **12 seconds** with dot indicators below.

---

## Agent Cards

Each card: `h-[200px]`, `rounded-lg`, `border border-zinc-800`, `bg-zinc-900/50`, `p-3`, `overflow-hidden`.

### The 6 Agents

| Emoji | Name | Sample steps |
|-------|------|-------------|
| `🤝` | Sales Agent | Scanning inbox &rarr; Found lead &rarr; Scored 87/100 &rarr; Drafting follow-up |
| `💰` | Finance Agent | Connected to Chase &rarr; Pulled 142 transactions &rarr; Auto-categorized 97.2% &rarr; Flagging anomaly |
| `📋` | Project Agent | Scanned #product-updates &rarr; Found 3 action items &rarr; Created tasks &rarr; Assigning |
| `🎧` | Support Agent | Monitoring Zendesk &rarr; New ticket #4821 &rarr; Matched KB article &rarr; Drafting response |
| `👥` | HR Agent | Reviewing 12 applications &rarr; Screened against requirements &rarr; Top 3 shortlisted &rarr; Scheduling |
| `📣` | Marketing Agent | Analyzing campaign &rarr; Open rate 34.2% &rarr; Top segment: Enterprise CTOs &rarr; Generating report |

### Card Layout

```
+----------------------------------+
| [emoji] Agent Name         [dot] |  <- header: emerald pulse dot
|                                  |
| ✓ Step 1 text                    |  <- completed steps (emerald check)
| ✓ Step 2 text                    |
| ✓ Step 3 text                    |
| ⟳ Step 4 text                    |  <- active step (blue spinner)
|                                  |
| ┌──────────────────────────────┐ |
| │ "Typewriter output text..."█ │ |  <- output with blinking cursor
| └──────────────────────────────┘ |
+----------------------------------+
```

### Card Header

- Emoji (`text-lg`) + agent name (`text-sm font-medium text-zinc-100`)
- Emerald pulsing dot on the right (`size-2 animate-pulse bg-emerald-500`)

### Step Indicators

- Completed steps: emerald `<CheckIcon>` (`size-3 text-emerald-400`) + `text-zinc-400`
- Active (last) step while processing: blue spinning `<Loader2Icon>` (`size-3 animate-spin text-blue-400`) + `text-zinc-300`
- Steps animate in with Framer Motion: slide up 8px + fade, 300ms duration
- Uses `<AnimatePresence mode="popLayout">`

### Typewriter Output

- Container: `bg-zinc-800/50`, `rounded`, `px-2 py-1.5`
- Text: `text-xs text-zinc-300 italic`, wrapped in smart quotes
- Blinking cursor: `w-[2px] h-3 bg-zinc-300`, custom `cursor-blink` keyframe (1s, steps(2))
- Cursor only visible during typing phase

---

## Animation Timing

| Constant | Value | Purpose |
|----------|-------|---------|
| `STEP_INTERVAL` | 800ms | Delay between each step appearing |
| `TYPE_SPEED` | 20ms | Delay per character in typewriter effect |
| `DONE_PAUSE` | 3000ms | Pause after typing completes before resetting |
| `RESET_DURATION` | 500ms | Fade-out duration before cycle restarts |
| `AGENT_STAGGER` | 2000ms | Delay between each agent starting (desktop) |

### Animation Lifecycle

```
[delay] → stepping (reveal steps one by one, 800ms apart)
       → typing (typewriter at 20ms/char, blinking cursor)
       → done (pause 3s)
       → resetting (fade out 500ms)
       → restart cycle
```

Mobile carousel: each agent gets `delay=0` (starts immediately), cards swap every 12s with slide-left/slide-right transitions (`x: 20` &rarr; `x: 0` &rarr; `x: -20`, 300ms).

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Brand blue | `bg-blue-600` / `#3b82f6` | Primary CTA, BorderBeam start, active step spinner |
| Emerald | `bg-emerald-500` / `#10b981` | Status dots, completed step checks, BorderBeam end |
| Red | `bg-red-500` | LIVE badge, LIVE dot |
| Zinc-950 | `bg-zinc-950` | Demo card background |
| Zinc-900 | `bg-zinc-900/50` | Agent card background |
| Zinc-800 | `border-zinc-800`, `bg-zinc-800/50` | Borders, output box background |
| Zinc-300 | `text-zinc-300` | Active step text, agent count text, cursor |
| Zinc-400 | `text-zinc-400` | Completed step text |
| Zinc-100 | `text-zinc-100` | Agent name text |
| Muted foreground | `text-muted-foreground` | Subheadline |

---

## Typography

- Font family: inherited (Inter via site globals)
- Headline: `font-semibold` (sm), `font-bold` (lg)
- Agent names: `text-sm font-medium`
- Step text / output: `text-xs leading-relaxed`
- Badge text: `text-sm font-normal`
- Subheadline: `text-xl`

---

## Accessibility

- **Reduced motion**: All agents detect `prefers-reduced-motion: reduce` via `window.matchMedia`
  - Steps and output appear instantly (no animation)
  - Typewriter skipped; full text shown immediately
  - Phase locks to `done` (no cycling)
- Semantic HTML: `<section>`, `<h1>`, `<p>` elements used correctly
- Interactive elements are `<Button>` components with proper `href` links

---

## Responsive Breakpoints Summary

| Breakpoint | Padding | Headline size | Grid layout | 3D tilt | Agents shown |
|------------|---------|---------------|-------------|---------|--------------|
| < 640px (mobile) | `py-8 px-4` | `text-2xl` | Carousel (1) | No | 1, cycling |
| 640-767px (sm) | `py-16 px-6` | `text-3xl` | Carousel (1) | No | 1, cycling |
| 768-1023px (md/tablet) | `py-16 px-6` | `text-3xl` | 2-col grid | Yes | 4 |
| 1024px+ (lg/desktop) | `py-24 px-8` | `text-5xl` | 3-col grid | Yes | 6 |
