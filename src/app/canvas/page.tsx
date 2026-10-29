"use client";

import dynamic from "next/dynamic";

// Studio loads this route in its iframe to author sections (the project's Canvas URL
// is "/canvas"). Client-only: StudioCanvas reads window.location and talks to the
// parent frame, so a server render would mismatch on hydration. Site chrome,
// Live Preview and analytics stand down on this path (see isStudioCanvasPath).
const StudioCanvas = dynamic(() => import("@/studio/studio-canvas"), { ssr: false });

export default function CanvasPage() {
  return <StudioCanvas />;
}
