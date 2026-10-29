"use client";

import { StudioCanvas as Canvas, getSSRStyles } from "@contentstack/studio-react";
import "@/studio/register";

// Static import of the package, loaded client-only by app/canvas/page.tsx. Dynamic-
// importing "@contentstack/studio-react" itself fails a production build
// ("Package path . is not exported"), so the dynamic boundary sits on this file.
export default function StudioCanvas() {
  return (
    <>
      {/* StudioCanvas writes no design-token :root variables itself. */}
      <style>{getSSRStyles(null)}</style>
      <Canvas />
    </>
  );
}
