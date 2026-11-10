<div align="center">

# kitgrid

**Premium motion you can `npm update`.**

392 React components (accessible primitives, forms, data display, overlays, layout, dashboard and app-shell blocks, an AI
assistant kit, motion effects, backgrounds, a commerce kit and signature pieces) in one package with zero
runtime dependencies, plus 38 ECharts-powered charts in `kitgrid/charts`. Works with or without Tailwind, in server components,
on React 18 and 19.

[![npm](https://img.shields.io/npm/v/kitgrid?color=7c3aed&label=npm)](https://www.npmjs.com/package/kitgrid)
[![license](https://img.shields.io/badge/license-MIT-7c3aed)](./LICENSE)
![dependencies](https://img.shields.io/badge/runtime%20deps-0-7c3aed)
![types](https://img.shields.io/badge/types-included-7c3aed)
![tests](https://img.shields.io/badge/tests-1552%20passing-16a34a)

[Playground](#playground) · [Install](#install) · [Components](#components) ·
[Theming](#theming) · [Motion and accessibility](#motion-and-accessibility) ·
[Commerce kit](#commerce-kit) · [FAQ](#faq)

</div>

---

## Why kitgrid

Copy-paste galleries such as Aceternity UI, React Bits and Magic UI look stunning, but you
can't update code you pasted. They need Tailwind, pull in animation engines, and rarely handle
reduced motion or focus. Installable kits such as MUI, Mantine and Chakra update cleanly, but
they ship runtime CSS-in-JS or require Tailwind, and they offer no premium motion or commerce
coverage. kitgrid sits between the two.

|                                           | kitgrid | Copy-paste galleries | Installable kits |
| ----------------------------------------- | :-------: | :------------------: | :--------------: |
| Install and update with npm               |    ✅     |          —           |        ✅        |
| Works without Tailwind                    |    ✅     |          —           |      partly      |
| Premium motion effects                    |    ✅     |          ✅          |        —         |
| Reduced motion on every effect            |    ✅     |          —           |      partly      |
| Keyboard and screen-reader tested         |    ✅     |        partly        |        ✅        |
| Zero runtime dependencies                 |    ✅     |          —           |        —         |
| Server components without wrappers        |    ✅     |        partly        |        —         |
| Commerce kit with SKU-aware variant logic |    ✅     |          —           |        —         |

The full competitive analysis, with sources, is in
[`docs/market-research.md`](./docs/market-research.md).

## Install

```bash
npm i kitgrid
# pnpm add kitgrid · yarn add kitgrid · bun add kitgrid
```

Peer dependencies are `react` and `react-dom` 18.3 or later. kitgrid has no other runtime
dependencies. Charts are a separate entry with an optional peer:

```bash
npm i kitgrid echarts
```

```tsx
import { LineChart, SankeyChart } from "kitgrid/charts"
```

Line, area, bar, ranked and diverging bars, combo, donut, sparkline and spark grid, gauge, radar,
heatmap (with a calendar mode), waterfall, sankey, sunburst, treemap, funnel, scatter with
quadrants, dumbbell, bullet, mekko, polar bars and forecast bands. They theme from the same
`--kg-*` tokens, follow light and dark mode, stop animating under reduced motion and carry a
hidden data table for screen readers. The main `kitgrid` entry never imports ECharts.

### 1. Load the styles once

```tsx
// app/layout.tsx (Next.js), src/main.tsx (Vite), app/root.tsx (Remix)…
import "kitgrid/styles.css"
```

### 2. Use components

```tsx
import { Button, Price, Rating } from "kitgrid"

export const ProductMeta = () => (
  <>
    <Rating value={4.7} count={1284} />
    <Price amount={68} compareAt={94} size="lg" />
    <Button size="lg">Add to cart</Button>
  </>
)
```

That's the whole setup: there's no provider to wrap, no Tailwind config and no PostCSS plugin.

### With Tailwind CSS v4

Import the preset **before** Tailwind. kitgrid then sits between Tailwind's base and its
utilities, so preflight never strips component styles and utility classes always win as
overrides. The preset also exposes the tokens as utilities (`bg-kg-accent`,
`rounded-kg-lg`, `shadow-kg-md` and so on).

```css
/* globals.css */
@import "kitgrid/tailwind.css";
@import "tailwindcss";
```

### Load only what you render

For the smallest CSS payload, load the base layer plus a sheet per component. Each sheet already
includes the components it renders internally (for example, `product-card` includes `button`
and `rating`).

```tsx
import "kitgrid/base.css"
import "kitgrid/dialog/styles.css"
import "kitgrid/product-card/styles.css"
```

### Deep imports

Everything is available from the root, and every component also has its own entry:

```tsx
import { Dialog, DialogContent } from "kitgrid/dialog"
import { useReducedMotion } from "kitgrid/hooks"
```

The package is ESM-only. It's one file per module with `sideEffects` limited to CSS, so
bundlers tree-shake what you don't use.

## Playground

The repository includes a playground: a documentation app with live prop controls, generated
code, accessibility notes, a theme studio and a full storefront built only from the kit.

```bash
git clone <repo> && cd Kitgridui
npm install
npm run dev        # http://localhost:5360
```

| Page                  | What it shows                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#/`                  | Overview built from the library itself: aurora hero, rolling numbers, live bento                                                                             |
| `#/components`        | Gallery of live, lazily mounted previews of every component, filterable by category                                                                          |
| `#/components/<name>` | Live preview, prop controls, copyable code, examples and the keyboard map, with toggles for preview theme and reduced motion and a replay button             |
| `#/theming`           | Accent presets or any custom color, radius and density, plus the CSS to paste                                                                                |
| `#/storefront`        | A complete store: filters, a price histogram, quick view, SKU-aware variants, fly-to-cart, a persistent cart drawer, and confetti when free shipping unlocks |
| `#/kit`               | Components you ticked in the gallery: copy a share link (`#/kit?c=button,combobox`) or download them as a ready-to-run Vite project                           |

Press <kbd>Ctrl</kbd> <kbd>K</kbd> anywhere to search.

### Kit download

Tick the box on any gallery tile, or press **Add to kit** on a component page. The tray at the
bottom downloads a zip with:

- `src/examples/*`: one file per component, the same code the page shows.
- `src/kitgrid/*`: only the library source those components need (and the components they
  use), with their CSS. You own it.
- a Vite + TypeScript setup where `import … from "kitgrid"` resolves to that folder.

```bash
unzip kitgrid-kit.zip && cd kitgrid-kit
npm install && npm run dev
```

All 430 examples are checked together: the exported project type-checks under `strict` and
renders every example without an error.

### Studio

The visual page builder lives in its own app: [`kitgridstudio/`](../kitgridstudio).

## Components

| Category         | Components                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Signature**    | ProductSpin (360° product viewer with hotspots and inertia) · LiquidGlass (real refraction) · HoloCard (holographic foil) · DynamicIsland · Carousel (snap, coverflow, stack) · SwipeDeck · MorphDialog (shared-element morph) · ScrollStack · ImageTrail · CircularText                                                                                                                 |
| **Actions**      | Button · IconButton                                                                                                                                                                                                                                                                                                                                                                      |
| **Forms**        | Field · Input · Textarea · Checkbox / CheckboxGroup · Switch · RadioGroup · Slider (single and range) · SegmentedControl · PinInput                                                                                                                                                                                                                                                      |
| **Overlays**     | Dialog · Drawer (with drag-to-dismiss) · Popover · Tooltip · DropdownMenu · Select · Toast (`toast()` API)                                                                                                                                                                                                                                                                               |
| **Navigation**   | Tabs · Breadcrumb · Pagination                                                                                                                                                                                                                                                                                                                                                           |
| **Data display** | Accordion · Avatar / AvatarGroup · Badge · Card · Kbd · Separator · Tag · Stat · EmptyState                                                                                                                                                                                                                                                                                              |
| **Feedback**     | Alert · Progress / ProgressRing · Skeleton · Spinner                                                                                                                                                                                                                                                                                                                                     |
| **Text effects** | TextReveal · Typewriter · ShinyText · GradientText · NumberTicker (count and odometer) · ScrambleText · RotatingText · TextHighlight · ScrollText                                                                                                                                                                                                                                        |
| **Motion**       | SpotlightCard · TiltCard · Magnetic · ShimmerButton · BorderBeam · Marquee · Reveal · Dock · Ripple · Confetti · FlipCard                                                                                                                                                                                                                                                                |
| **Backgrounds**  | Aurora · GridPattern · DotPattern · Particles · Meteors · BackgroundBeams · Noise · HeroSpotlight                                                                                                                                                                                                                                                                                        |
| **Commerce**     | Price · Rating · QuantityStepper · VariantPicker · WishlistButton · StockIndicator · Countdown · FreeShippingProgress · CouponInput · AnnouncementBar · FilterChips · DeliveryEstimate · ProductCard · ProductGallery · QuickView · CartProvider / useCart · CartDrawer · CartButton · AddToCartButton (+ fly-to-cart) · CheckoutSteps · OrderSummary · PriceRangeSlider · ReviewSummary |

The playground documents every component's props, examples and keyboard behaviour.

## Design language

The default theme is **Orbit**: graphite neutrals, a single Signal Orange accent with near-black
text on it, light that sweeps around edges (conic "orbit light"), and things that turn rather than
slide. It's documented in [`docs/DESIGN.md`](./docs/DESIGN.md), and the next section shows how to
replace it with your own brand in one line.

## Theming

Every value is a CSS custom property in `@layer kg.tokens`, so your own unlayered CSS always
wins without `!important`.

### Rebrand with one variable

```css
:root {
  --kg-accent: oklch(0.58 0.16 250);
  --kg-accent-fg: oklch(0.99 0 0);
  --kg-radius: 0.5rem;
  --kg-density: 0.9;
}
```

The hover, text-safe (`-strong`), display, soft, edge and glow shades derive from the accent with `color-mix()`. The radius
scale (`xs` to `2xl`), the control heights and the spacing follow `--kg-radius` and
`--kg-density`.

### Dark mode

Put `data-theme="dark"` or the `dark` class on any ancestor, or use `data-theme="system"` to
follow the OS. Light and dark can be mixed on the same page.

### Scoped themes

```tsx
<section data-kg-scope style={{ "--kg-accent": "oklch(0.62 0.2 25)" }}>
  <Button>Clearance</Button>
</section>
```

Floating layers (popovers, menus, tooltips, toasts) render in the browser's top layer through
the Popover API rather than a portal, so they keep the theme of the subtree that opened them.

<details>
<summary><strong>Token reference</strong></summary>

| Group     | Tokens                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| Surfaces  | `--kg-bg` `--kg-surface` `--kg-surface-raised` `--kg-surface-sunken` `--kg-muted` `--kg-overlay` |
| Text      | `--kg-fg` `--kg-fg-muted` `--kg-fg-faint`                                                              |
| Lines     | `--kg-border` `--kg-border-strong` `--kg-ring`                                                         |
| Accent    | `--kg-accent` `--kg-accent-fg` → derived `-strong` `-soft` `-edge` `-glow`                               |
| Status    | `--kg-success` `--kg-warning` `--kg-danger` `--kg-info`, each with `-fg`                             |
| Shape     | `--kg-radius` → `--kg-radius-xs…2xl`, `--kg-radius-full`                                               |
| Density   | `--kg-density` → `--kg-space`, `--kg-control-sm/md/lg`                                                 |
| Elevation | `--kg-shadow-xs/sm/md/lg` (tinted by `--kg-shadow-tint`)                                                 |
| Type      | `--kg-text-xs…5xl`, `--kg-font-mono` (components inherit your font)                                      |
| Motion    | `--kg-duration-instant/fast/base/slow/slower/spring/bounce`, `--kg-ease-out/in/in-out/spring/bounce`     |
| Layers    | `--kg-z-sticky/overlay/popover/toast/tooltip`                                                              |

`--kg-ease-spring` and `--kg-ease-bounce` are real damped-spring curves sampled into CSS
`linear()`, so springs cost no JavaScript.

</details>

## Motion and accessibility

Every animated component follows one contract:

- **Reduced motion is respected, live.** Durations collapse under `prefers-reduced-motion`.
  Effects driven by `requestAnimationFrame` or canvas read `useReducedMotion()`, which updates
  when the OS setting changes. Motion snaps to its final state rather than disappearing, and
  loading indicators slow down instead of stopping.
- **The server renders a meaningful first frame.** Text effects send real, readable text, and
  random effects use seeded generators, so hydration never mismatches.
- **Effects pause** when offscreen or when the tab is hidden.
- **No re-render per frame.** Per-frame values are written to CSS variables through refs, and
  springs run on a small rAF integrator (`createSpring`).
- **Screen readers hear text once.** Split-text effects expose the full string and hide the
  pieces.

Force reduced motion for a subtree, for example in a settings panel or for tests:

```tsx
import { KitgridProvider } from "kitgrid"

;<KitgridProvider reducedMotion="always">{children}</KitgridProvider>
```

Interactive widgets follow the WAI-ARIA Authoring Practices keyboard maps:

- **Composite widgets:** roving focus, typeahead in menus and selects, Home/End and
  PageUp/PageDown on sliders and steppers.
- **Overlays:** focus returns to the trigger, nested layers close one at a time, and modals use
  the native `<dialog>` element.
- **Commerce:** prices read as "Sale price $49.50, Regular price $79.00", and sold-out variants
  are announced.

## Server components

`"use client"` sits only on modules that need it. `Button`, `Badge`, `Card`, `Price`,
`StockIndicator`, `ProductCard`, `Progress`, `Stat`, `Aurora`, `Noise`, `Meteors` and the
static patterns render as server components and ship no JavaScript. Interactive components
import from server files with no wrapper.

## Commerce kit

The headless cart state plugs straight into the UI:

```tsx
"use client"

import {
  AddToCartButton,
  CartButton,
  CartDrawer,
  CartProvider,
  ProductCard,
  Toaster,
} from "kitgrid"

export const Shop = ({ product }) => (
  <CartProvider currency="USD" storageKey="cart" freeShippingThreshold={150}>
    <header>
      <CartButton />
    </header>

    <ProductCard
      title={product.title}
      href={`/products/${product.handle}`}
      image={{ src: product.image, alt: product.imageAlt }}
      price={product.price}
      compareAt={product.compareAt}
      rating={product.rating}
      reviewCount={product.reviewCount}
    />

    <AddToCartButton
      item={{
        productId: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
      }}
    />

    <CartDrawer onCheckout={(lines) => startCheckout(lines)} />
    <Toaster />
  </CartProvider>
)
```

- **`CartProvider`** gives you merged SKUs, quantity clamping, localStorage persistence that
  stays in sync across tabs and hydrates without a mismatch, and separate state and action
  contexts so buttons don't re-render when totals change.
- **`VariantPicker` + `resolveVariantAvailability` / `findVariant`** grey out impossible
  size and color combinations, using your variants' stock.
- **`AddToCartButton`** moves through adding, added and back. `useFlyToCart()` flies the
  product image to any `[data-cart-target]`.
- **`PriceRangeSlider`** includes an optional price histogram, `DeliveryEstimate` accounts for
  business days, holidays and cutoffs, and `Countdown` is hydration-safe.

Every label accepts a `labels` prop, and money and dates use `Intl`, so any locale and currency
works.

## Hooks

The building blocks the components use are public, from `kitgrid` or `kitgrid/hooks`:

`useReducedMotion` · `useSpring` / `createSpring` · `usePointerVars` · `useInView` ·
`useFloating` · `useDismiss` · `usePresence` · `useRovingFocus` · `useScrollLock` ·
`useControllableState` · `useMediaQuery` · `useEventCallback` · `useIsomorphicLayoutEffect`

There are also two primitives: `Slot` (powers every `asChild`) and `Layer` (top-layer
surface).

## Size

The numbers below are gzipped, unminified ESM (your bundler minifies further) and include
shared hooks:

| Component                                    |      gz |
| -------------------------------------------- | ------: |
| Badge                                        |  0.6 kB |
| Button                                       |  1.3 kB |
| Price                                        |  1.2 kB |
| TextReveal                                   |  2.5 kB |
| Tabs                                         |  3.2 kB |
| TiltCard                                     |  3.6 kB |
| Dialog                                       |  5.9 kB |
| Select                                       |  7.6 kB |
| ProductCard                                  | 12.2 kB |
| `styles.css` (all 392 components and charts) |  138 kB |

Run `npm run size -w kitgrid` for the full table.

## Browser support

The styles target Chrome/Edge 111+, Firefox 113+ and Safari 16.4+ (`color-mix()`, `:has()`,
cascade layers). Native nesting is lowered at build time. `Layer` falls back to
`position: fixed` where the Popover API is missing, and relative colour syntax always has a
`color-mix()` fallback.

## Development

```
Kitgridui/
├─ packages/kitgrid     the published library
│  ├─ src/components/<name>/   <name>.tsx · <name>.css · <name>.test.tsx · index.ts
│  ├─ src/hooks · src/primitives · src/utils · src/styles
│  └─ scripts/            generate barrels · build CSS · size report
├─ apps/playground        Vite documentation app (runs against library source)
└─ docs/market-research.md
```

```bash
npm run dev          # playground with hot reload against library source
npm run verify       # generate → typecheck → 1,552 tests → build
npm run size -w kitgrid
```

The build is plain `tsc`, which emits one ESM file per module and keeps `"use client"` per
file. Lightning CSS then bundles and lowers the stylesheets.

[`CONTRIBUTING.md`](./CONTRIBUTING.md) is the component contract: file anatomy, styling rules,
the motion and accessibility contract, and testing.

## FAQ

<details>
<summary><strong>Do I need Tailwind?</strong></summary>

No. kitgrid ships precompiled CSS. If you use Tailwind v4, import `kitgrid/tailwind.css`
for layer ordering and token utilities.

</details>

<details>
<summary><strong>Can I override a component's styles?</strong></summary>

Yes, and any way you like. Every component takes `className` and `style`, exposes `data-*`
attributes for variant and state (`[data-variant="soft"]`, `[data-state="open"]`), and its
styles live in a cascade layer. Any normal selector of yours wins, with no `!important`
needed.

</details>

<details>
<summary><strong>Does it work with Next.js App Router?</strong></summary>

Yes. Import `kitgrid/styles.css` in `app/layout.tsx` and import components anywhere. Server
components can render the server-safe components directly and can import the interactive
ones without a wrapper.

</details>

<details>
<summary><strong>Why not wrap Radix or Base UI?</strong></summary>

Primitives built on platform features (`<dialog>`, the Popover API, native inputs) need less
code and have fewer focus edge cases. They also avoid inheriting a dependency's breaking
changes, such as the shadcn move from Radix to Base UI in 2026. Every keyboard map is covered
by tests.

</details>

<details>
<summary><strong>What about animation libraries like Motion or GSAP?</strong></summary>

They aren't needed. Springs are CSS `linear()` curves or a 1 kB rAF integrator, and other
effects use CSS, WAAPI and canvas. If your app already uses Motion, the two coexist without
conflict.

</details>

## Roadmap

- `npx kitgrid add <component>` to eject a component's source into your repo
- Combobox / Command palette, DatePicker, DataTable
- A Figma kit generated from the tokens

## License

[MIT](./LICENSE). Free for commercial use, with no Commons Clause and no AGPL parts.
