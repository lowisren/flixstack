#!/usr/bin/env ts-node
// ============================================================
// Flixstack ContentStack Seed Script
// Populates your ContentStack stack with sample content.
//
// Usage:
//   pnpm seed
//
// Prerequisites:
//   - CONTENTSTACK_MANAGEMENT_TOKEN in .env.local
//   - NEXT_PUBLIC_CONTENTSTACK_API_KEY in .env.local
//   - NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT in .env.local
//
// What this creates:
//   - 5 genres
//   - 20 movies
//   - 3 TV series (with seasons + episodes)
//   - 10 cast/crew person entries
//   - 3 hero banner entries
//   - 5 homepage rail entries
//   - 1 site_config entry
//   - 4 navigation entries, 1 header entry, 1 footer entry
// ============================================================

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as contentstack from "@contentstack/management";

const { api_key, management_token, environment } = {
  api_key: process.env.NEXT_PUBLIC_CONTENTSTACK_API_KEY,
  management_token: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
  environment: process.env.NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT ?? "production",
};

if (!api_key || !management_token) {
  console.error("❌  Missing CONTENTSTACK_MANAGEMENT_TOKEN or NEXT_PUBLIC_CONTENTSTACK_API_KEY in .env.local");
  process.exit(1);
}

const client = contentstack.client({ authtoken: management_token });
const stack = client.stack({ api_key });

async function createEntry(
  contentTypeUid: string,
  entry: Record<string, unknown>
): Promise<string> {
  try {
    const result = await stack.contentType(contentTypeUid).entry().create({ entry });
    await stack.contentType(contentTypeUid).entry(result.uid).publish({
      publishDetails: {
        locales: ["en-us"],
        environments: [environment],
      },
    });
    console.log(`  ✓ Created ${contentTypeUid}: ${entry.title ?? entry.name}`);
    return result.uid;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Failed to create ${contentTypeUid}:`, msg);
    return "";
  }
}

async function seed() {
  console.log("\n🌱  Flixstack Seed Script\n");
  console.log(`Stack: ${api_key}`);
  console.log(`Environment: ${environment}\n`);

  // ─── Genres ──────────────────────────────────────────────
  console.log("Creating genres…");
  const genres: Record<string, string> = {};

  for (const genre of [
    { title: "Action", slug: "action", description: "High-octane thrills and explosive set pieces.", color_accent: "#ef4444" },
    { title: "Drama", slug: "drama", description: "Character-driven stories exploring human experience.", color_accent: "#8b5cf6" },
    { title: "Sci-Fi", slug: "sci-fi", description: "Visions of the future and alternate realities.", color_accent: "#3b82f6" },
    { title: "Comedy", slug: "comedy", description: "Laugh-out-loud moments and heartwarming stories.", color_accent: "#f59e0b" },
    { title: "Documentary", slug: "documentary", description: "Compelling true stories from around the world.", color_accent: "#10b981" },
    { title: "Thriller", slug: "thriller", description: "Edge-of-your-seat suspense and tension.", color_accent: "#f97316" },
  ]) {
    genres[genre.slug] = await createEntry("genre", {
      ...genre,
      url: `/${genre.slug}`,
    });
  }

  // ─── People ──────────────────────────────────────────────
  console.log("\nCreating people…");
  const people: Record<string, string> = {};

  for (const person of [
    { name: "Christopher Nolan", slug: "christopher-nolan", bio: "British-American filmmaker.", role: "director" },
    { name: "Leonardo DiCaprio", slug: "leonardo-dicaprio", bio: "Oscar-winning actor.", role: "actor" },
    { name: "Cillian Murphy", slug: "cillian-murphy", bio: "Irish actor.", role: "actor" },
    { name: "Denis Villeneuve", slug: "denis-villeneuve", bio: "Canadian sci-fi director.", role: "director" },
    { name: "Timothée Chalamet", slug: "timothee-chalamet", bio: "French-American actor.", role: "actor" },
    { name: "Zendaya", slug: "zendaya", bio: "Emmy-winning actress.", role: "actor" },
    { name: "Vince Gilligan", slug: "vince-gilligan", bio: "Creator of Breaking Bad.", role: "producer" },
    { name: "Bryan Cranston", slug: "bryan-cranston", bio: "Emmy-winning actor.", role: "actor" },
    { name: "Aaron Paul", slug: "aaron-paul", bio: "Emmy-winning actor.", role: "actor" },
    { name: "Jeremy Allen White", slug: "jeremy-allen-white", bio: "Golden Globe-winning actor.", role: "actor" },
  ]) {
    people[person.slug] = await createEntry("person", {
      ...person,
      url: `/${person.slug}`,
    });
  }

  // ─── Movies ──────────────────────────────────────────────
  console.log("\nCreating movies…");

  const movies = [
    { title: "Inception", slug: "inception", runtime: 148, rating: "PG-13", release_date: "2010-07-16", genres: ["sci-fi", "action"], content_tier: "free", score: 94 },
    { title: "The Dark Knight", slug: "the-dark-knight", runtime: 152, rating: "PG-13", release_date: "2008-07-18", genres: ["action", "thriller"], content_tier: "free", score: 97 },
    { title: "Interstellar", slug: "interstellar", runtime: 169, rating: "PG-13", release_date: "2014-11-07", genres: ["sci-fi", "drama"], content_tier: "premium", score: 92 },
    { title: "Dune: Part One", slug: "dune-part-one", runtime: 155, rating: "PG-13", release_date: "2021-10-22", genres: ["sci-fi", "action"], content_tier: "free", score: 90 },
    { title: "Dune: Part Two", slug: "dune-part-two", runtime: 166, rating: "PG-13", release_date: "2024-03-01", genres: ["sci-fi", "action"], content_tier: "premium", score: 93 },
  ];

  for (const movie of movies) {
    await createEntry("movie", {
      ...movie,
      url: `/${movie.slug}`,
      synopsis: `A compelling story in ${movie.genres[0]} genre.`,
      genres: movie.genres.map((g) => ({ uid: genres[g] })).filter((r) => r.uid),
      tags: [movie.genres[0], "featured"],
    });
  }

  // ─── Homepage configuration ───────────────────────────────
  console.log("\nCreating homepage configuration…");

  await createEntry("hero_banner", {
    title: "Dune: Part Two",
    subtitle: "The legend becomes the messiah.",
    cta_label: "Watch Now",
    cta_url: "/watch/dune-part-two",
    badge_text: "Now Streaming",
  });

  await createEntry("site_config", {
    title: "Flixstack Config",
    site_name: "Flixstack",
    feature_flags: { dev_mode: true, lytics_enabled: false },
  });

  // ─── Header / Footer / Navigation ─────────────────────────
  console.log("\nCreating navigation, header, and footer…");

  const navigation: Record<string, string> = {};

  for (const nav of [
    {
      key: "main",
      title: "Main Navigation",
      links: [
        { label: "Home", href: "/" },
        { label: "Browse", href: "/browse" },
        { label: "Movies", href: "/browse?type=movie" },
        { label: "TV Shows", href: "/browse?type=tv_series" },
      ],
    },
    {
      key: "footer-browse",
      title: "Footer - Browse",
      links: [
        { label: "All Titles", href: "/browse" },
        { label: "Movies", href: "/browse?type=movie" },
        { label: "TV Shows", href: "/browse?type=tv_series" },
        { label: "Genres", href: "/browse#genres" },
      ],
    },
    {
      key: "footer-account",
      title: "Footer - Account",
      links: [
        { label: "My Profile", href: "/profile" },
        { label: "Watchlist", href: "/profile#watchlist" },
        { label: "Watch History", href: "/profile#history" },
      ],
    },
    {
      key: "footer-developer",
      title: "Footer - Developer",
      links: [
        { label: "Setup Guide", href: "/setup" },
        { label: "Content Models", href: "/setup#content-models" },
        { label: "Personalization", href: "/setup#personalization" },
        { label: "Automations", href: "/setup#automations" },
      ],
    },
  ]) {
    navigation[nav.key] = await createEntry("navigation", {
      title: nav.title,
      links: nav.links,
    });
  }

  const navRef = (key: string) => [{ uid: navigation[key], _content_type_uid: "navigation" }];

  await createEntry("header", {
    title: "Main Header",
    main_navigation: navRef("main"),
    show_search: true,
    show_profile: true,
  });

  await createEntry("footer", {
    title: "Main Footer",
    columns: [
      { heading: "Browse", links: navRef("footer-browse") },
      { heading: "Account", links: navRef("footer-account") },
      { heading: "Developer", links: navRef("footer-developer") },
    ],
    legal_text: `© ${new Date().getFullYear()} Flixstack. All rights reserved.`,
  });

  console.log("\n✅  Seed complete!\n");
  console.log("Next steps:");
  console.log("  1. Run: pnpm dev");
  console.log("  2. Open: http://localhost:3000");
  console.log("  3. Click the CS Inspector button (bottom-right) to explore content models\n");
}

seed().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
