# UI Design

This note captures the current visual system for `services/web`.

## Source Of Truth

- Theme tokens and component overrides live in `services/web/src/theme.ts`.
- Shared glass surface styles and layout-level tokens live in `services/web/src/App.css`.
- Shared reusable UI primitives live in `services/web/src/components/ui`.

## Visual Direction

- Keep the product light and close to white rather than beige.
- Use a subtle glass treatment instead of flat fills or heavy skeuomorphism.
- Prefer square-ish corners with soft rounding over pill-shaped controls.
- Preserve the existing typography pairing:
  - display/headings: `Space Grotesk`
  - body and UI copy: `IBM Plex Sans`

## Palette

- Base background: near-white blue-gray.
  - `background.default`: `#f7fafe`
  - page gradients should stay in the white to pale-blue range, with only light warm accents
- Primary brand tone: muted eucalyptus/slate green.
  - `primary.main`: `#355652`
  - `primary.light`: `#6b8b86`
  - `primary.dark`: `#1f3532`
- Secondary accent: softened coral, used sparingly.
  - `secondary.main`: `#d98673`
  - `secondary.light`: `#ebb1a4`
  - `secondary.dark`: `#a96356`
- Status colors should stay desaturated and blended into the glass system rather than fully saturated UI alerts.
- Text should remain cool and dark:
  - `text.primary`: `#1b2733`
  - `text.secondary`: `#677482`

## Material System

- Primary surfaces use translucent white fills with blur and a soft border.
- Default surface treatment:
  - white fill around 58% to 88% opacity depending on emphasis
  - bright top-edge border/highlight
  - muted blue-gray secondary stroke for control outlines
  - soft shadow, never hard drop shadows
- The visual goal is "glass, but quiet":
  - avoid heavy tinting
  - avoid dark frosted panels
  - avoid thick borders or strong gloss

## Shape Language

- Default surface radius: `14px`
- Large surface radius: `16px`
- Standard control radius: `12px`
- Inputs can stay slightly softer at `14px`
- Chips should be tighter than buttons, not pill-shaped
- Dialogs and overlays should feel aligned with the same family, not circular

## Component Rules

- Buttons:
  - no pill buttons
  - keep them paper-like and mostly flat rather than glossy or shaded
  - contained and outlined buttons should use subtle tinted fills with quiet borders, not gradients
  - text buttons should still feel integrated with the system, but should avoid boxed shadows
- Icon buttons:
  - same paper-like treatment as buttons
  - same square-ish radius family
  - utility actions in dense headers and rails should step down to a smaller icon-button size
- Shared component rule:
  - use the primitives in `services/web/src/components/ui` before creating new ad hoc MUI button, icon-button, or popover compositions
  - if a pattern repeats twice, promote it into that library instead of copying styles
- Panels and cards:
  - use the shared glass panel treatment from `App.css`
  - keep panels brighter than the page background
- Inputs:
  - white translucent fill
  - soft border, slightly darker on hover/focus
- Lists and rows:
  - todo rows and collaborator rows should read like shallow glass tiles
  - empty states should use a light dashed treatment, not heavy boxes
- Dangerous actions:
  - use pale pink/red glass styling instead of harsh solid red blocks

## Interaction Notes

- Workspace settings opens as a centered modal, not as a full page mode.
- Create workspace and collaborators use the same anchored popover pattern rather than modal flows.
- On desktop, the workspace chrome uses an expandable left sidebar instead of a top header.
- The desktop sidebar should own workspace context and controls:
  - collapsed state is the default
  - the top icon acts as the workspace selector trigger
  - expanded state reveals a full-width workspace picker with its collapse action on a separate row
  - create workspace and collaborators sit directly under the workspace picker
  - settings sits in the footer beside logout, and groups are separated with visible dividers
  - the main content column should not repeat workspace title/description cards above the real content
- On mobile, app navigation collapses into a top trigger that opens a full-screen drawer.
- The mobile drawer toggle icon changes between open and closed states.
- The workspace control strip keeps utility icon actions at the top right:
  - settings is a cog only
  - logout is icon only
  - workspace picker leads the control row, then create workspace, then collaborators
  - signed-in user info sits below the main controls instead of using a page title

## When Updating The Design

- Start with `theme.ts` first so MUI components move together.
- Use `App.css` only for shared layout surfaces or app-specific glass styling.
- If a new component introduces a different radius, justify it explicitly.
- Keep new colors within the current cool-white + muted green/coral family unless a feature has a strong product reason to diverge.
- Prefer thin borders and flatter fills over pronounced shadows when refining the workspace chrome.
