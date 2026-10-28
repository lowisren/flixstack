import Link from "next/link";
import { Search, Home } from "lucide-react";
import { Button, Heading, Panel } from "@/design-system";

export default function NotFound() {
  return (
    <div className="grid-backdrop relative flex flex-col items-center justify-center min-h-[70vh] px-4 py-16">
      {/* Strange Days "signal lost" panel. The glitch displacement animation
          lands in PR 5 with the rest of the motion layer; the panel itself is
          static so this route carries no ungated animation today. */}
      <Panel border="control" scanlines className="w-full max-w-lg">
        {/* Status strip */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-2.5 font-mono text-xs uppercase tracking-widest">
          <span className="text-signal">Signal lost</span>
          <span className="text-text-secondary tabular-nums">err 404</span>
        </div>

        <div className="px-5 py-8 sm:px-8">
          <p
            className="glitch font-display text-6xl sm:text-7xl leading-none text-signal/25 select-none"
            aria-hidden="true"
          >
            404
          </p>

          <Heading as="h1" size="2xl" className="mt-4">
            No such transmission
          </Heading>

          <p className="mt-3 text-text-secondary">
            We couldn&apos;t find what you were looking for. It may have been moved
            or removed.
          </p>

          <p className="mt-5 font-mono text-xs text-text-secondary">
            <span className="text-accent" aria-hidden="true">
              &gt;{" "}
            </span>
            trace route --target requested_page
          </p>

          <div className="mt-7 flex items-center gap-3 flex-wrap">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4" aria-hidden="true" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/search">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search
              </Link>
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
