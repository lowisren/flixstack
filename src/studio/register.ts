// ============================================================
// Studio component registry
//
// Everything Studio can place on the canvas is registered here. Must only ever be
// imported from the client graph (app/studio-init.tsx, studio/studio-page.tsx):
// registering from a Server Component leaves the browser registry empty and every
// component renders as "Component Loading Error" after hydration.
//
// Phase 3 of docs/studio-plan.md adds the components and breakpoints.
// ============================================================

export {};
