# Frontend

Use this file for repo-specific continuity, pitfalls, and owned areas for this toolkit.

- Current visual system reference: `notes/architecture/ui-design.md`
- The shared UI direction is now a light near-white glass system with subtle square radii rather than pill-shaped controls.
- Shared UI primitives live in `services/web/src/components/ui`; use those before raw MUI for recurring buttons, icon buttons, and popovers so app chrome stays consistent.
