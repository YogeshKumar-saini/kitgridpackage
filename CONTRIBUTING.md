# Contributing to kitgrid

This document is the contract every component follows. Read it end to end before adding one.

## Workspace

```
kitgridpackage/packages/kitgrid   the published library
Kitgridui/                        Next.js site; documents every component against the built library
```

```bash
npm install
npm run build        # in kitgridpackage: generate → clean → tsc → css; the site picks up dist/
npm run size
```

## Anatomy of a component

```
packages/kitgrid/src/components/<name>/
  <name>.tsx         implementation
  <name>.css         styles, inside @layer kg.components
  <name>.test.tsx    behaviour tests (keyboard, ARIA, state)
  index.ts           public exports for this folder only
```

- `<name>` is kebab-case and becomes the deep import path: `kitgrid/<name>`.
- `npm run generate` rebuilds `src/components/index.ts` and `src/styles/components.css` from the
  folders. Never edit those two files by hand.
- One folder may export a compound family (`Dialog`, `DialogTrigger`, `DialogContent`, …).

## TypeScript

- Strict mode, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`.
- Relative imports carry the `.js` extension (`../../utils/cx.js`). The build is plain `tsc`, so
  this is what makes the published ESM resolve in Node and every bundler.
- Components are `forwardRef` arrow functions with a `displayName`, so they work on React 18.3
  and 19 alike. Spread remaining props onto the root element and merge `className` with `cx`.
- Export a `<Component>Props` interface for every component. Prefix every other exported type
  with the component name (`SelectOption`, `VariantOption`), because all folders share one barrel.
- No runtime dependencies. Peer dependencies are `react` and `react-dom` only.
- No `any`. No default exports.

## Server components

Add `"use client"` as the first line of a file **only** if it uses hooks, context, effects,
refs it reads, or browser APIs. Presentational components (`Button`, `Badge`, `Price`) stay
server-safe and ship zero JavaScript in an RSC tree. Set `serverSafe: true` on their demo.

## Styling

Components are written by hand in **Tailwind v4** classes in the **Paper Layers** design. The
reference implementation is `packages/kitgrid/src/components/button/button.tsx`; the spec is
`docs/superpowers/specs/2026-10-31-paper-layers-foundation-design.md`.

- **Paper Layers:** solid sheets separated by a crisp offset shadow (`shadow-kg-*`). Never blur
  shadows, gradients, glass or glow. Generous radii (`rounded-kg-*`).
- **Classes:** use the kg theme (`bg-kg-surface`, `text-kg-fg`, `border-kg-ink`,
  `bg-kg-paper-sage`, `h-kg-md`, …) from `src/styles/theme.css`. Spacing utilities already
  follow the density token. No raw hex or oklch values.
- **Recipes:** variants and sizes go through `variants()` from `src/utils/variants.ts`, so
  option names are type-checked. Keep `data-*` attributes for state and variant.
- **Hooks:** keep one root class `kg-<name>` and BEM-ish parts `kg-<name>__<part>` on every
  element, even when no CSS targets them. Users and tests select by them.
- **Hover and press** use the `interactive:` variant, which skips disabled and aria-disabled.
- **Private custom properties** are prefixed `--_` and set on the element itself
  (`[--_lift:var(--kg-paper-sage)]`). Overriding a `--kg-shadow-*` token on an element does
  nothing, because tokens resolve where they are defined.
- **Tailwind traps** (the build's `scripts/check-classes.mjs` catches the first three):
  - A class glued to a template interpolation (`` `bg-x${…}` ``) is never generated. Put a space
    before `${` or use `cx()`.
  - Inside an arbitrary value, a `var(--_x)` straight after `*`, `+`, `-` or `/` compiles to
    `var(-- x)`. Put `var()` first, add parentheses, or compute the value in JS.
  - `duration-kg-*` generates nothing (Tailwind v4 has no duration namespace). Use
    `duration-(--kg-duration-fast)`.
  - `items-[…]` and `justify-[…]` generate nothing; use `[align-items:…]`.
  - `grid`/`flex` utilities beat the UA `[hidden]` rule: add `[&[hidden]]:hidden`.
  - An element can't container-query itself.
- **Locale:** format dates and numbers through `useLocale(locale)` so server render and
  hydration print the same text.
- **Kept CSS** is only for `@keyframes`, `@property`, masks, gradient stacks and selectors
  utilities can't reach (descendant HTML, view transitions).
- **Layers:** utilities sit in `kg.utilities`, below `kg.components`. While unconverted
  components remain, their sheets may still adjust a converted child.
- **Never fight a child's utilities with your own.** Without tailwind-merge, class order does
  not decide which utility wins. Adjust a child through its props or its `--_` properties.
- **Focus:** `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring`.
- **Motion:** animate transform, opacity, filter, clip-path and registered properties only;
  ease-out; respect `motion-reduce:`. Height reveals use `grid-template-rows: 0fr → 1fr`.
- **Contrast:** every text and colour pair meets WCAG AA in light and in dark ("night paper").

## Motion contract

Every component that moves honours reduced motion in two ways:

1. CSS: transitions use `--kg-duration-*`, which collapse to 1ms under
   `prefers-reduced-motion: reduce` and under `[data-kg-motion="reduce"]`.
   Infinite decorative loops (marquees, auroras, shimmer) must be paused or removed explicitly in
   both of those cases. Loading indicators slow down instead of stopping.
2. JS: anything driven by `requestAnimationFrame`, canvas or WAAPI reads `useReducedMotion()` and
   renders its final or static state. The hook is live, so components react to the setting
   changing.

Effects also:

- render a meaningful static first frame on the server (no layout shift on hydration);
- pause when offscreen (`useInView` with `once: false`) or when `document.hidden`;
- write per-frame values to styles or CSS variables through refs, never through React state;
- clean up every listener, observer, timer and animation frame on unmount.

## Accessibility

- Follow the WAI-ARIA Authoring Practices pattern for the widget (dialog, menu, listbox, tabs,
  radio group, slider, spinbutton …) including the full keyboard map.
- Composite widgets use `useRovingFocus`; mark items with `data-kg-item`.
- Floating layers render through `Layer` (top layer via the Popover API) and are positioned with
  `useFloating`; dismissal uses `useDismiss`; exit animations use `usePresence`.
- Modal surfaces use the native `<dialog>` element with `showModal()` plus `useScrollLock`.
- Text effects that split text into spans put the full string in an accessible label and mark
  the pieces `aria-hidden`.
- Icon-only controls require a `label` prop.
- Color is never the only signal.

## Comments

Write a comment only when it explains *why*: a browser quirk, an a11y requirement, a non-obvious
trade-off. A one-line JSDoc on props that need it is welcome. Never narrate what the next line
does.

## Tests

Use Jest and Testing Library (`npm test` in `kitgridpackage`). Cover behaviour a user or assistive technology can observe:
roles, names, keyboard interaction, controlled and uncontrolled state, callbacks. Avoid
snapshot tests.

## Playground demo

Each group of components has a file in `Kitgridui/src/demos/*.tsx` that exports
`demos = [defineDemo({...})]`. A demo provides:

- `controls` for the props worth exploring, and a `code(values)` that prints the JSX someone
  would write (`jsx()` drops props equal to their defaults, `raw()` prints expressions);
- one or two `examples` showing real compositions;
- `accessibility` notes listing the keyboard map and ARIA behaviour.

Import components from `"kitgrid"` exactly as a consumer would, and icons from
`lucide-react`.
