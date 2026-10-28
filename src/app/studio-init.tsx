"use client";

// Runs the Studio SDK init and the component registrations in the browser. Rendered
// once from the root layout: importing them there directly would keep them in the
// server graph only. A module import rather than a useEffect, so the init has run
// before any Studio route renders.
import "@/lib/studio/sdk";
import "@/studio/register";

export function StudioInit() {
  return null;
}
