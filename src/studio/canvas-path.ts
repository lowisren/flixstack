/** Studio's section-authoring canvas (the project's Canvas URL). */
export const STUDIO_CANVAS_PATH = "/canvas";

/**
 * Site chrome, Live Preview and analytics stand down on the canvas: it renders one
 * section at a time inside Studio's iframe, and anything else on the page there
 * either distorts the section or surfaces its own errors inside Studio.
 * Root layouts can't read the pathname, so each piece checks for itself.
 */
export function isStudioCanvasPath(pathname: string | null) {
  return pathname === STUDIO_CANVAS_PATH || Boolean(pathname?.startsWith(`${STUDIO_CANVAS_PATH}/`));
}
