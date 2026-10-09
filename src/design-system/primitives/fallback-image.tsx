"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * `next/image` that swaps to `fallback` if the image fails to load — a deleted
 * or unpublished Contentstack asset should leave a placeholder, not a broken
 * image icon.
 *
 * This is the only client-side piece of a title card, so the card itself can
 * stay a server component.
 */
export function FallbackImage({ fallback, onError, ...props }: ImageProps & { fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line jsx-a11y/alt-text -- alt is required by ImageProps and passed through
    <Image
      {...props}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
