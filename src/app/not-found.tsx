import Link from "next/link";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="mb-6">
        <span className="text-8xl font-bold text-[var(--color-accent)] opacity-20 select-none">
          404
        </span>
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-3">
        Page not found
      </h1>
      <p className="text-[var(--color-text-secondary)] mb-8 max-w-sm">
        We couldn&apos;t find what you were looking for. It may have been moved or removed.
      </p>
      <div className="flex items-center gap-3">
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
  );
}
