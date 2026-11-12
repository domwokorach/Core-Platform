# FINIX Design System

> **Purpose:** the visual and interaction rules for the FINIX interface, so new screens look and behave like the existing ones.
> **Source of truth:** the tokens in [`frontend/app/globals.css`](frontend/app/globals.css) and the components in [`frontend/components`](frontend/components). Where this document and the code differ, the code is what ships; differences are called out as **Deviations** so they can be decided deliberately.
> **Related:** [README](README.md) · [Development Rules](RULE.md) · [Risk Register](RISK.md)

## 1. Brand identity

**FINIX**: premium, modern, minimal, professional, trustworthy, sophisticated. The interface is deliberately **monochrome** (black, greys, white). Colour appears only where it carries meaning: money direction, chart series, status badges, merchant logos.

* **Logo:** the FINIX mark (rounded square with the "F" and a grey dot) plus the wordmark. Components: `LogoMark`/`Logo` (`components/layout/logo.tsx`); assets `frontend/public/finix-icon.svg` and `infra/keycloak/themes/finix/login/resources/img/logo.svg`. Never recolour, stretch or redraw it.
* **Voice:** plain British English, calm and precise; no exclamation marks in financial contexts; error text never reveals sensitive detail.

## 2. Colour

### 2.1 Core palette

| Name | Hex | Typical use |
| --- | --- | --- |
| Black | `#000000` | Primary buttons, strongest emphasis |
| Charcoal | `#171717` | Body text, active navigation, focus ring |
| Graphite | `#404040` | Secondary surfaces, chart series |
| Grey | `#737373` | Tertiary text, icons, chart series |
| Light grey | `#E5E5E5` | Borders, dividers |
| Off-white | `#F5F5F5` | Muted surfaces, inputs' hover, cards on white |
| White | `#FFFFFF` | Page and card background |

Also used: `#262626`, `#A3A3A3`, `#D4D4D4` (inputs), `#080808` (sign-in hero background).

**Deviation (accessibility):** secondary text uses `--muted-foreground: #6b6b6b`, not `#737373`, so it keeps ≥ 4.5:1 contrast on the `#F5F5F5` surface (WCAG AA). Use `#737373` for non-text elements and large text only.

### 2.2 Semantic and financial colours

| Meaning | Token / class | Value (light) | Dark |
| --- | --- | --- | --- |
| Negative amount | `text-red-600` / `dark:text-red-400` | `#DC2626` | `#F87171` |
| Positive amount | `text-green-600` / `dark:text-green-400` | `#16A34A` | `#4ADE80` |
| Zero amount | `text-neutral-500` | `#737373` | |
| Success / warning / destructive / info (UI) | `--success`, `--warning`, `--destructive`, `--info` | **neutral by design** (charcoal/grey) | white/grey |

* Colour is applied to the **amount text only**, never the whole row, and the sign (`−` / `+`) is always shown, so meaning never depends on colour alone.
* **Deviation:** the brief lists negative as `#EF4444` (Tailwind red-500). The implementation uses red-600 (`#DC2626`) because red-500 on white is below AA contrast for normal text. Positive green `#16A34A` matches the brief. Confirm with the design owner before changing.
* Positive account balances, where a balance is displayed, use the same green. Everything else stays monochrome.
* Form errors are charcoal text with a charcoal border and a muted fill (not red) so validation does not rely on hue.

### 2.3 Chart colours (use selectively)

| Series | Token | Fill | Text variant (AA on white) |
| --- | --- | --- | --- |
| Revenue / income | `--income` (emerald) | `#10B981` | `#047857` |
| Expenses | `--expense` (coral) | `#F87171` | `#B91C1C` |
| Profit | `--profit` (blue) | `#3B82F6` | `#1D4ED8` |
| Savings | `--savings` (teal) | `#14B8A6` | `#0F766E` |
| Investments | `--investments` (violet) | `#8B5CF6` | `#6D28D9` |
| Pending | `--pending` (amber) | `#F59E0B` | `#92400E` |
| Neutral / historical | `--historical` (grey-blue) | `#94A3B8` | `#475569` |

Monochrome series use `--chart-1…6` (black → light grey; inverted in dark mode). Charts must stay understandable without hue: use direct labels, patterns or line styles, tooltips with values, and a text alternative.

## 3. Currency and numbers

* Primary currency **GBP (£)**, `en-GB`, two decimals, integer **pence** in storage and APIs (`amountMinor`). Use `formatGBP`, `money` and `formatTransactionAmount` in `lib/utils/format.ts`; never hand-format.
* Examples: `£10,524.15`, `−£14.99`, `+£3,762.11`. Securities quoted in USD show `US$…` and are never relabelled as £; any GBP figure is labelled indicative.
* Numbers use tabular figures (`tabular-nums`, `.num` utility) so columns align.

## 4. Typography

* **Geist Sans** for UI text and **Geist Mono** for references and code (loaded via the `geist` package in `app/layout.tsx`). Inter is an acceptable fallback; do not mix additional families.
* Guidance (observed in the shipped screens):

| Role | Size / weight | Notes |
| --- | --- | --- |
| Page title | 28–32 px, 600–650, tracking −0.03 to −0.035 em | Sign-in and registration headings |
| Section heading | 18–20 px, 600 | Cards, dialogs |
| Body | 14–16 px, 400–500, line-height 1.5–1.6 | 16 px for form inputs (prevents iOS zoom) |
| Caption / helper | 12–13 px, 400–500 | Use `--muted-foreground` |
| Wordmark | 19–22 px, 600, tracking −0.03 em | |
| Large figures | 28–40 px, 600, tabular | Balances, totals |

## 5. Shape, depth and spacing

* Radius `--radius: 0.875rem` (14 px); controls use `rounded-xl` (12 px), cards `rounded-2xl`, pills fully rounded.
* Shadows are subtle: `--shadow-sm`, `--shadow-card`, `--shadow-lift` (hover). Borders are `1px solid var(--border)`.
* Spacing is generous: 16 px gutters on mobile, 24–32 px on desktop; form fields 16–18 px apart; touch targets **≥ 44 × 44 px**.

## 6. Components

All built on Radix/shadcn-style primitives in `frontend/components/ui`.

| Component | Rule |
| --- | --- |
| **Button** | Primary: black fill, white text, `rounded-xl`, 50–52 px on authentication screens. Hover darkens slightly, press scales to ~0.985, loading shows a spinner and a text change ("Signing in…"). Disabled is 55–70 % opacity and not focusable by mouse. |
| **Input** | 48–50 px high, `rounded-xl`, border `#D4D4D4`, hover `#A3A3A3`, focus border `#171717` with a soft 4 px ring. Always a visible `<label>`. Errors use `aria-invalid` and `aria-describedby`, text below the field. |
| **Card** | White, 1 px border, `shadow-card`, `rounded-2xl`. |
| **Dialog / Drawer** | Radix Dialog, focus-trapped, labelled; side drawers (`vaul`) on mobile. |
| **Table** | TanStack Table; sortable headers are buttons; full table from `md`, card list below. |
| **Tabs, Dropdown, Tooltip, Popover, Select** | Radix; keyboard-operable; do not hide essential information in tooltips. |
| **Navigation** | PaceUI motion sidebar (`components/paceui/motion/sidebar.tsx`, wrapped by `components/layout/app-sidebar.tsx`): persistent rail from 1024 px (17 rem, collapses to 4.75 rem; state kept in `localStorage` and the component's `sidebar_state` UI cookie; Ctrl/Cmd+B toggles), a sheet below 1024 px, plus bottom navigation on mobile. The current page has `aria-current="page"`; the highlight is PaceUI's soft grey pill that follows hover and focus. |
| **Transaction row** | Merchant tile, name, secondary line (account · category · status), right-aligned amount. See §8. |
| **Notifications** | Popover list plus `sonner` toasts; status uses icon + text, not colour only. |
| **Skeletons** | Shimmer placeholders shaped like the final content; no layout shift. |
| **Banking card** | See §7. |

## 7. Banking cards

* Two designs: **Everyday account** (matte black) and **Savings account** (lighter/teal variant in the app; light-grey/white in the sign-in artwork). Each shows the FINIX wordmark, account label, **GBP**, and a **masked identifier** (`•••• 4568`, `•••• 0958`), plus the cardholder name where relevant.
* **My Accounts and dashboard card components do not show balances** (`AccountCard` is rendered with `showBalance={false}`); balances appear in dedicated, labelled balance areas only. Do not add balance text to these cards.
* **Visa branding is conditional.** `NEXT_PUBLIC_VISA_BRANDING_APPROVED=true` *and* official assets in `public/brand/` are required; otherwise a neutral chip is shown. Do not imply a real card programme, network affiliation or issuing without authorisation. Sandbox cards never display a card number or CVV and are labelled as sandbox.
* Decorative artwork on public pages uses fictional masked numbers and no real data.

### 7.1 Designer card collection (removed)

The decorative "Card designs" gallery (Everyday, Savings, Metal, Signature) was removed from the Cards page; the page shows only the real Black and Silver cards in the carousel.

## 8. Merchant logos

* Netflix (`netflix.com`), DKNY (`dkny.com`), Starbucks Coffee (`starbucks.com`), KFC (`kfc.com`) are matched **server-side** by exact normalised alias (`MerchantDirectory`), then displayed by `MerchantLogo` from Logo.dev using only the verified domain.
* Presentation: fixed neutral tile (36 px mobile, 40 px tablet, 44 px desktop), white in light **and** dark mode, thin border, `object-contain` with padding. Logos are never stretched, cropped, filtered or recoloured.
* States: loading shimmer → fade-in; any failure (404, 401, 429, offline, no key) → neutral store icon with the merchant name still visible. Never a broken-image graphic.
* A visible "Logos provided by Logo.dev" attribution and trademark notice are shown whenever logos are enabled. Brand logos belong to their owners ([COPYRIGHT.md](COPYRIGHT.md)).

## 9. Authentication pages

* **Desktop (≥ 1024 px):** full-height **50 / 50** split. Left: black-to-charcoal hero with a faint grid, soft radial highlights, FINIX logo (top-left), headline "Banking made beautifully simple.", supporting text, two overlapping decorative cards (matte black Everyday, light-grey Savings) and the footer line "Modern banking. Thoughtfully designed." Right: white panel, form centred, maximum width 420–440 px.
* **Tablet (768–1023 px):** split is kept at 768+ with smaller type and scaled-down artwork; below 768 the hero stacks above the form.
* **Mobile (< 640 px):** single column, logo and compact headline at the top, **no large artwork**, full-width fields and button, safe-area padding.
* **Where it lives:** credential entry is hosted by **Keycloak** and themed in `infra/keycloak/themes/finix` (FreeMarker templates + CSS/JS), not in React, so the identity provider still receives the credentials. The Next.js `/login` and `/register` routes are thin entry pages that start the OIDC flow (and the expired-session and error states). Motion for React cannot run inside Keycloak, so the theme uses CSS animations with the same timings.
* **States:** default, focus, inline validation, loading ("Creating your account…"), incorrect credentials (generic message), lock-out/temporarily unavailable, expired sign-in attempt, verification required, Keycloak unavailable. Messages never reveal whether an account exists.
* **Development-only:** the `finix-dev` theme adds a "Development Account" helper card and the dev demo sign-in adds a "Development Demo" notice. Neither is part of the production design.

## 10. Responsive behaviour

| Viewport | Layout |
| --- | --- |
| **Desktop ≥ 1024 px** | Sidebar + multi-column dashboard, full transaction table, side-by-side card and charts |
| **Tablet 640–1023 px** | Adaptive grids, collapsible/drawer navigation, compact rows (~40 px logos) |
| **Mobile < 640 px** | Single column, bottom navigation, compact banking cards, transaction **cards/list** (36 px logos, truncated names, right-aligned amounts), no horizontal scroll |

Test widths: 375, 390, 430, 768, 1024, 1440, 1920 px. No horizontal overflow at any width.

## 11. Motion (Motion for React)

Defined in `frontend/lib/animations/variants.ts`: easing `[0.22, 1, 0.36, 1]`; durations **hover 150 ms, control 200 ms, card/list entrance 280 ms, page 320 ms**. Guidance: hero/card reveal 400–600 ms, form entrance 300–400 ms, validation messages 200–250 ms.

* Hover: subtle lift (`shadow-lift`, ≤ 8 px translate). Cards: slight perspective/elevation only on decorative artwork. Dialogs: fade + small scale/slide. Page: fade/slide of ≤ 14 px.
* No continuous, large or distracting animation; never delay an action for animation.
* **Reduced motion:** the app wraps UI in `MotionConfig reducedMotion="user"` and Keycloak CSS disables animation under `prefers-reduced-motion`. Provide a non-animated equivalent for every animation.

## 12. Light and dark mode

`next-themes` toggles the `.dark` class. Dark mode inverts surfaces (`#0A0A0A` background, white foreground, `#333` borders). Merchant logo tiles stay white; chart tokens switch to light-on-dark values. Check contrast in both themes.

## 13. Accessibility (WCAG 2.2 AA target)

* Semantic landmarks and headings; a "Skip to content" link; one `h1` per page.
* Everything operable by keyboard with a **visible focus indicator** (2 px charcoal outline/ring, ≥ 3:1).
* Text contrast ≥ 4.5:1 (3:1 for large text and UI components); colour never the only signal.
* Labels for every input; errors announced (`role="alert"` / `aria-live`); `aria-invalid` and `aria-describedby`; autocomplete attributes (`username`, `current-password`, `new-password`, `email`).
* Icon-only buttons carry an accessible name ("Show password", "Copy username").
* Touch targets ≥ 44 px; form text ≥ 16 px; no content lost at 320 px or 200 % zoom.
* Automated checks use `@axe-core/playwright` where included; they complement, not replace, manual keyboard and screen-reader testing, which has **not** been completed for every screen.

## 14. Change process

New UI patterns are added here with their rationale, accessibility notes and tests. Do not introduce new colours, fonts or radii without updating the tokens and this document.


## 15. Motion components (PaceUI) and card artwork

* **Where they live:** `frontend/components/paceui/motion/*` (copied from the PaceUI registry, reviewed before use; `use client` added; Base UI, `react-day-picker` and `date-fns` are the only new dependencies) and `components/ui/glare-card.tsx` (Aceternity glare card, installed but unused: its fixed 17:21 portrait aspect would distort the card artwork).
* **Integrated:** tabs (card types, accounts), alert (card status, live-connection status), slider (spending limits, kept in sync with the validated number inputs), spring button (`ActionButton`: subtle press, no shake, plain `Button` for reduced motion), select (account, currency), calendar (date filter), pagination, empty state, progress (`components/ui/progress.tsx` now wraps it), radio group (theme), scroll area (notifications list), sidebar.
* **Card artwork:** `public/cards/finix-visa-black.png` (transparent PNG) and `public/cards/finix-visa-silver-cutout.png`, a derived copy of `finix-visa-silver.png` (opaque black background) with only the border-connected background made transparent so it sits cleanly on light pages; the card pixels and the original file are unchanged. Artwork is always shown whole at its natural aspect ratio. The glare is a pointer-tracked highlight masked to the card shape (mouse only, off for reduced motion).
* **Not integrated:** Aceternity's logo cloud, three-column and centered-with-logo blocks are paid Pro items (API token required) and were not installed; FINIX also has no public landing page or verified partners to show.
