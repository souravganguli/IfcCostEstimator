# Feature: Fluent 2 Design System

Status: Standardized on the official Fluent 2 Web Components (`@fluentui/web-components`), bundled with the application and themed by a local CSS token layer. Chrome interaction coverage and visual verification pass locally; deployed verification remains pending.

## Goal

Give all viewer surfaces and controls a consistent, accessible Fluent 2 visual language by using the official Fluent 2 Web Components for interactive controls, complemented by shared design tokens, without loading external UI assets at runtime.

## Scope

Build interactive controls (buttons, inputs, checkboxes, switches, sliders, dropdowns, menus, tabs, trees, message bars, spinners, and related elements) from the official `@fluentui/web-components` package, registered centrally in `src/app/fluent-bootstrap.ts` and constructed through the typed helpers in `src/core/fluent.ts`. Apply shared typography, color, shape, elevation, focus, density, and interaction states to the application ribbon, tool rail, side panes, viewer controls, feature panels, form controls, status surfaces, and dialogs/menus. The Fluent component package is bundled with the application; use system fonts and do not load remote fonts, stylesheets, scripts, or other assets at runtime. Native HTML form controls are used only where Fluent provides no equivalent (file and color inputs) and inherit the shared token styling. Exclude feature behavior changes.

## Design Policy

This policy is binding for all current and future UI work. Deviations are only
allowed when explicitly recorded in the [Recorded Deviations](#recorded-deviations)
section below, with a reason.

1. **Fluent components first.** Use the official Fluent 2 Web Components
   (`@fluentui/web-components`) for every interactive control to the greatest
   extent possible. Register components in `src/app/fluent-bootstrap.ts` and
   construct them through the typed helpers in `src/core/fluent.ts`. Do not
   hand-build an element when a Fluent component exists for it.
2. **Custom components need prior approval and are isolated.** Prefer a Fluent
   component in every case. A custom-made (non-Fluent) component may only be
   created after **explicit user approval**, and the request must state **why a
   custom component is required** (specifically, which Fluent component was
   considered and why it does not fit). Once approved, the component lives in a
   dedicated `src/components/` directory — not inside a feature module, the
   shell, or `src/core/` — and must consume the Fluent design tokens (text
   sizes, spacing, color, radius, elevation) defined in `src/app/fluent2.css`.
   One-off, feature-private markup that is not a reusable component stays with
   its feature.
3. **Fluent design language.** Use the Fluent text sizes (the type ramp in
   requirement 7) and the Fluent spacing scale (requirement 8) for all surfaces
   and components. Do not introduce ad-hoc font sizes, line heights, or spacing
   values outside this ramp and scale.
4. **Record every deviation.** Any departure from rules 1–3 — a native fallback
   control, a non-Fluent component, or an off-ramp text size or spacing value —
   must be recorded in [Recorded Deviations](#recorded-deviations) with the
   location and the reason. An unrecorded deviation is a policy violation to be
   fixed, not a precedent.

## Recorded Deviations

The following are the only approved departures from the Design Policy. Add a row
when a new deviation is introduced; remove a row when the deviation is resolved.

None currently. The file picker, color swatch, and vector drawing surface — which
have no Fluent equivalent — are implemented as approved custom components under
`src/components/` and are therefore compliant rather than deviations.

## Requirements

1. Use the official Fluent 2 Web Components (`@fluentui/web-components`) for interactive controls, applying the Fluent web light theme once at startup, and define application-wide semantic tokens for brand, neutral foreground/background, strokes, focus, danger, corner radii, and elevation that align shell and native-fallback controls with those components.
2. Use a Segoe UI/system font stack, consistent text hierarchy, Fluent-style neutral surfaces, blue brand actions, and restrained elevation.
3. Give buttons and form controls consistent sizing, borders, corners, hover/pressed/disabled states, placeholders, and visible keyboard focus.
4. Apply the same tokens to shell components and feature-generated panels, hierarchy/search rows, property categories, status and error feedback, and viewer overlays.
5. Respect `prefers-reduced-motion` and preserve existing labels, keyboard behavior, minimum supported viewport, and local-only runtime asset boundary.
6. Bundle the Fluent component package with the application so no external font, stylesheet, script, or other UI asset is requested at runtime; register components centrally and construct them through the shared typed helpers.
7. Use a fixed type ramp: Caption 12/16 (labels, helper text, property names, category headers, footer), Body 14/20 (controls, values), and Subtitle 14/20 semibold (pane and panel titles). Sub-headings are 12/16 semibold in secondary color. The compact ribbon and footer use Caption 12 as their minimum size.
8. Use a 4px spacing scale (4/8/12/16) for padding and gaps, 40px pane headers and rail items, 32px default controls, and 24px compact controls. Panels are separated by a single hairline rather than boxed borders.

## Dependencies

- [Viewer shell and tool panes](viewer-tool-sidebar.md), [Element Properties](element-properties.md), and existing feature modules.
- The `@fluentui/web-components` package, registered in `src/app/fluent-bootstrap.ts` and constructed through the typed helpers in `src/core/fluent.ts`.
- Application-wide tokens and styling are imported from `src/app/fluent2.css`.
- Custom (non-Fluent) components live under `src/components/` and consume the shared tokens; see the [Design Policy](#design-policy).

## Acceptance Criteria

- Verify primary, secondary, disabled, hover, pressed, and focus-visible control states and consistent form-control appearance in Chrome.
- Verify ribbon, rail, tool/property panes, feature panels, property groups, status, and error surfaces use the Fluent components and shared design tokens, and that feature modules construct controls via the shared helpers rather than ad-hoc raw elements (except the file and color native fallbacks).
- Verify typography resolves to the local system font stack and no external fonts, stylesheets, or other UI assets are requested at runtime.
- Verify custom (non-Fluent) components live under `src/components/`, consume the shared tokens, and that every deviation from the [Design Policy](#design-policy) is listed in [Recorded Deviations](#recorded-deviations).
- Run typecheck, unit tests, production build, and the browser suite; retain existing local-fixture skips as skips.
