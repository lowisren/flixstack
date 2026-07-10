// ============================================================
// FLIXSTACK — Mock Data
// Used when ContentStack env vars are not configured.
// Replace with live ContentStack data by setting:
//   NEXT_PUBLIC_CONTENTSTACK_API_KEY, NEXT_PUBLIC_CONTENTSTACK_DELIVERY_TOKEN,
//   NEXT_PUBLIC_CONTENTSTACK_ENVIRONMENT in .env.local
// ============================================================

// This file is source data for scripts/seed.ts and scripts/upload-assets.ts only
// (the app itself now reads exclusively from Contentstack — see src/lib/contentstack/queries.ts).
// It intentionally uses its own plain-string image types rather than ./types's
// Contentstack Asset shape, since these are pre-upload seed values, not live CMS data.

interface MockGenre {
  uid: string;
  title: string;
  slug: string;
  description: string;
  color_accent: string;
  hero_image?: string;
}

interface MockPerson {
  uid: string;
  name: string;
  slug: string;
  bio: string;
  photo: string;
  role: "actor" | "director" | "producer";
}

interface MockMovie {
  uid: string;
  content_type: "movie";
  title: string;
  slug: string;
  synopsis: string;
  release_date: string;
  runtime: number;
  rating: string;
  genres: MockGenre[];
  cast: MockPerson[];
  director: MockPerson;
  hero_image: string;
  thumbnail: string;
  trailer_url?: string;
  content_tier: "free" | "premium";
  tags: string[];
  score: number;
}

interface MockTvSeries {
  uid: string;
  content_type: "tv_series";
  title: string;
  slug: string;
  synopsis: string;
  release_date: string;
  rating: string;
  genres: MockGenre[];
  cast: MockPerson[];
  creator: MockPerson;
  hero_image: string;
  thumbnail: string;
  seasons: {
    uid: string;
    season_number: number;
    release_date: string;
    episodes: {
      uid: string;
      title: string;
      slug: string;
      episode_number: number;
      duration: number;
      synopsis: string;
      thumbnail: string;
      air_date: string;
    }[];
  }[];
  status: "ongoing" | "ended" | "upcoming";
  content_tier: "free" | "premium";
  tags: string[];
  score: number;
}

type MockTitle = MockMovie | MockTvSeries;

interface MockHeroBanner {
  uid: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_url: string;
  background_image: string;
  badge_text?: string;
  linked_title?: MockTitle;
}

interface MockHomepageRail {
  uid: string;
  title: string;
  rail_type: "editorial" | "automated";
  items: MockTitle[];
  layout: "landscape" | "portrait" | "hero";
}

// Local aliases so the rest of this file reads the same as before.
type Genre = MockGenre;
type Person = MockPerson;
type Movie = MockMovie;
type TvSeries = MockTvSeries;
type HeroBanner = MockHeroBanner;
type HomepageRail = MockHomepageRail;

// Picsum photo IDs for consistent seeded images
const img = (id: number, w = 800, h = 450) =>
  `https://picsum.photos/seed/fs${id}/${w}/${h}`;
const portrait = (id: number) => `https://picsum.photos/seed/person${id}/200/200`;

// ─── Genres ──────────────────────────────────────────────────────────────────

export const GENRES: Genre[] = [
  { uid: "g1", title: "Action", slug: "action", description: "High-octane thrills, chase sequences, and explosive set pieces.", color_accent: "#ef4444", hero_image: img(10) },
  { uid: "g2", title: "Drama", slug: "drama", description: "Character-driven stories exploring the depth of human experience.", color_accent: "#8b5cf6", hero_image: img(20) },
  { uid: "g3", title: "Sci-Fi", slug: "sci-fi", description: "Visions of the future, alternate realities, and the unknown cosmos.", color_accent: "#3b82f6", hero_image: img(30) },
  { uid: "g4", title: "Comedy", slug: "comedy", description: "Laugh-out-loud moments and heartwarming stories.", color_accent: "#f59e0b", hero_image: img(40) },
  { uid: "g5", title: "Documentary", slug: "documentary", description: "Compelling true stories from around the world.", color_accent: "#10b981", hero_image: img(50) },
  { uid: "g6", title: "Thriller", slug: "thriller", description: "Edge-of-your-seat suspense and nail-biting tension.", color_accent: "#f97316", hero_image: img(60) },
];

// ─── People ──────────────────────────────────────────────────────────────────

export const PEOPLE: Person[] = [
  { uid: "p1", name: "Christopher Nolan", slug: "christopher-nolan", bio: "British-American filmmaker known for cerebral blockbusters.", photo: portrait(1), role: "director" },
  { uid: "p2", name: "Leonardo DiCaprio", slug: "leonardo-dicaprio", bio: "Oscar-winning actor known for transformative roles.", photo: portrait(2), role: "actor" },
  { uid: "p3", name: "Cillian Murphy", slug: "cillian-murphy", bio: "Irish actor celebrated for intense, nuanced performances.", photo: portrait(3), role: "actor" },
  { uid: "p4", name: "Kate Winslet", slug: "kate-winslet", bio: "Acclaimed British actress with multiple Oscar nominations.", photo: portrait(4), role: "actor" },
  { uid: "p5", name: "Denis Villeneuve", slug: "denis-villeneuve", bio: "Canadian director known for visually stunning science fiction.", photo: portrait(5), role: "director" },
  { uid: "p6", name: "Timothée Chalamet", slug: "timothee-chalamet", bio: "French-American actor and one of Hollywood's brightest stars.", photo: portrait(6), role: "actor" },
  { uid: "p7", name: "Zendaya", slug: "zendaya", bio: "Emmy-winning actress and style icon.", photo: portrait(7), role: "actor" },
  { uid: "p8", name: "Vince Gilligan", slug: "vince-gilligan", bio: "Creator of Breaking Bad and Better Call Saul.", photo: portrait(8), role: "producer" },
  { uid: "p9", name: "Bryan Cranston", slug: "bryan-cranston", bio: "Emmy-winning actor best known for Breaking Bad.", photo: portrait(9), role: "actor" },
  { uid: "p10", name: "Aaron Paul", slug: "aaron-paul", bio: "Emmy-winning actor, known for Jesse Pinkman.", photo: portrait(10), role: "actor" },
  { uid: "p11", name: "Matt Duffer", slug: "matt-duffer", bio: "Co-creator of Stranger Things.", photo: portrait(11), role: "producer" },
  { uid: "p12", name: "Millie Bobby Brown", slug: "millie-bobby-brown", bio: "British actress who rose to fame as Eleven in Stranger Things.", photo: portrait(12), role: "actor" },
  { uid: "p13", name: "Christopher Storer", slug: "christopher-storer", bio: "Creator and writer of The Bear.", photo: portrait(13), role: "producer" },
  { uid: "p14", name: "Jeremy Allen White", slug: "jeremy-allen-white", bio: "Golden Globe-winning actor known for The Bear.", photo: portrait(14), role: "actor" },
  { uid: "p15", name: "Ridley Scott", slug: "ridley-scott", bio: "Veteran director behind Alien and Blade Runner.", photo: portrait(15), role: "director" },
];

// ─── Movies ──────────────────────────────────────────────────────────────────

export const MOVIES: Movie[] = [
  {
    uid: "m1", content_type: "movie", title: "Inception", slug: "inception",
    synopsis: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    release_date: "2010-07-16", runtime: 148, rating: "PG-13",
    genres: [GENRES[2], GENRES[0]], cast: [PEOPLE[1], PEOPLE[2]], director: PEOPLE[0],
    hero_image: img(101, 1920, 800), thumbnail: img(101),
    content_tier: "free", tags: ["mind-bending", "heist", "dreams", "blockbuster"], score: 94,
    trailer_url: "https://www.youtube.com/watch?v=YoHD9XEInc0",
  },
  {
    uid: "m2", content_type: "movie", title: "The Dark Knight", slug: "the-dark-knight",
    synopsis: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    release_date: "2008-07-18", runtime: 152, rating: "PG-13",
    genres: [GENRES[0], GENRES[5]], cast: [PEOPLE[2]], director: PEOPLE[0],
    hero_image: img(102, 1920, 800), thumbnail: img(102),
    content_tier: "free", tags: ["superhero", "dark", "joker", "batman"], score: 97,
  },
  {
    uid: "m3", content_type: "movie", title: "Interstellar", slug: "interstellar",
    synopsis: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    release_date: "2014-11-07", runtime: 169, rating: "PG-13",
    genres: [GENRES[2], GENRES[1]], cast: [PEOPLE[1], PEOPLE[3]], director: PEOPLE[0],
    hero_image: img(103, 1920, 800), thumbnail: img(103),
    content_tier: "premium", tags: ["space", "time-travel", "family", "science"], score: 92,
  },
  {
    uid: "m4", content_type: "movie", title: "Dune: Part One", slug: "dune-part-one",
    synopsis: "Feature adaptation of Frank Herbert's science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.",
    release_date: "2021-10-22", runtime: 155, rating: "PG-13",
    genres: [GENRES[2], GENRES[0]], cast: [PEOPLE[5], PEOPLE[6]], director: PEOPLE[4],
    hero_image: img(104, 1920, 800), thumbnail: img(104),
    content_tier: "free", tags: ["epic", "desert", "prophecy", "sci-fi"], score: 90,
  },
  {
    uid: "m5", content_type: "movie", title: "Dune: Part Two", slug: "dune-part-two",
    synopsis: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    release_date: "2024-03-01", runtime: 166, rating: "PG-13",
    genres: [GENRES[2], GENRES[0]], cast: [PEOPLE[5], PEOPLE[6]], director: PEOPLE[4],
    hero_image: img(105, 1920, 800), thumbnail: img(105),
    content_tier: "premium", tags: ["epic", "desert", "war", "messiah"], score: 93,
  },
  {
    uid: "m6", content_type: "movie", title: "The Godfather", slug: "the-godfather",
    synopsis: "The aging patriarch of an organized crime dynasty in postwar New York City transfers control of his clandestine empire to his reluctant youngest son.",
    release_date: "1972-03-24", runtime: 175, rating: "R",
    genres: [GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[14],
    hero_image: img(106, 1920, 800), thumbnail: img(106),
    content_tier: "free", tags: ["crime", "family", "classic", "mafia"], score: 99,
  },
  {
    uid: "m7", content_type: "movie", title: "Parasite", slug: "parasite",
    synopsis: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
    release_date: "2019-05-30", runtime: 132, rating: "R",
    genres: [GENRES[5], GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[4],
    hero_image: img(107, 1920, 800), thumbnail: img(107),
    content_tier: "free", tags: ["class", "korea", "oscar-winner", "social"], score: 96,
  },
  {
    uid: "m8", content_type: "movie", title: "Mad Max: Fury Road", slug: "mad-max-fury-road",
    synopsis: "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners and a drifter named Max.",
    release_date: "2015-05-15", runtime: 120, rating: "R",
    genres: [GENRES[0]], cast: [PEOPLE[3]], director: PEOPLE[14],
    hero_image: img(108, 1920, 800), thumbnail: img(108),
    content_tier: "free", tags: ["post-apocalyptic", "feminist", "cars", "action"], score: 91,
  },
  {
    uid: "m9", content_type: "movie", title: "Everything Everywhere All at Once", slug: "everything-everywhere-all-at-once",
    synopsis: "An aging Chinese immigrant is swept up in an insane adventure in which she alone can save existence by exploring other universes connecting with the lives she could have led.",
    release_date: "2022-03-25", runtime: 139, rating: "R",
    genres: [GENRES[2], GENRES[3]], cast: [PEOPLE[1], PEOPLE[6]], director: PEOPLE[0],
    hero_image: img(109, 1920, 800), thumbnail: img(109),
    content_tier: "free", tags: ["multiverse", "family", "immigration", "oscar-winner"], score: 95,
  },
  {
    uid: "m10", content_type: "movie", title: "Top Gun: Maverick", slug: "top-gun-maverick",
    synopsis: "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN's elite graduates on a mission that demands the ultimate sacrifice.",
    release_date: "2022-05-27", runtime: 131, rating: "PG-13",
    genres: [GENRES[0]], cast: [PEOPLE[5]], director: PEOPLE[14],
    hero_image: img(110, 1920, 800), thumbnail: img(110),
    content_tier: "free", tags: ["jets", "military", "sequel", "action"], score: 96,
  },
  {
    uid: "m11", content_type: "movie", title: "Oppenheimer", slug: "oppenheimer",
    synopsis: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    release_date: "2023-07-21", runtime: 180, rating: "R",
    genres: [GENRES[1], GENRES[5]], cast: [PEOPLE[2], PEOPLE[6]], director: PEOPLE[0],
    hero_image: img(111, 1920, 800), thumbnail: img(111),
    content_tier: "premium", tags: ["ww2", "nuclear", "biography", "oscar-winner"], score: 93,
  },
  {
    uid: "m12", content_type: "movie", title: "The Matrix", slug: "the-matrix",
    synopsis: "When a beautiful stranger leads a computer hacker to a forbidding underworld, he discovers the shocking truth–the life he knows is the elaborate deception of an evil cyber-intelligence.",
    release_date: "1999-03-31", runtime: 136, rating: "R",
    genres: [GENRES[2], GENRES[0]], cast: [PEOPLE[1], PEOPLE[3]], director: PEOPLE[14],
    hero_image: img(112, 1920, 800), thumbnail: img(112),
    content_tier: "free", tags: ["cyberpunk", "simulation", "classic", "action"], score: 93,
  },
  {
    uid: "m13", content_type: "movie", title: "John Wick", slug: "john-wick",
    synopsis: "An ex-hitman comes out of retirement to track down the gangsters who killed his dog, a last gift from his recently deceased wife.",
    release_date: "2014-10-24", runtime: 101, rating: "R",
    genres: [GENRES[0], GENRES[5]], cast: [PEOPLE[1]], director: PEOPLE[14],
    hero_image: img(113, 1920, 800), thumbnail: img(113),
    content_tier: "free", tags: ["assassin", "revenge", "dog", "action"], score: 86,
  },
  {
    uid: "m14", content_type: "movie", title: "The Grand Budapest Hotel", slug: "the-grand-budapest-hotel",
    synopsis: "A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel's glorious years under an exceptional concierge.",
    release_date: "2014-03-07", runtime: 99, rating: "R",
    genres: [GENRES[3], GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[0],
    hero_image: img(114, 1920, 800), thumbnail: img(114),
    content_tier: "free", tags: ["wes-anderson", "quirky", "hotel", "europe"], score: 88,
  },
  {
    uid: "m15", content_type: "movie", title: "Knives Out", slug: "knives-out",
    synopsis: "A detective investigates the death of a patriarch of an eccentric, combative family.",
    release_date: "2019-11-27", runtime: 130, rating: "PG-13",
    genres: [GENRES[3], GENRES[5]], cast: [PEOPLE[1], PEOPLE[3]], director: PEOPLE[14],
    hero_image: img(115, 1920, 800), thumbnail: img(115),
    content_tier: "free", tags: ["whodunit", "mystery", "ensemble", "murder"], score: 91,
  },
  {
    uid: "m16", content_type: "movie", title: "The Social Network", slug: "the-social-network",
    synopsis: "As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued by the twins who claimed he stole their idea, and by the co-founder who was later squeezed out of the business.",
    release_date: "2010-10-01", runtime: 120, rating: "PG-13",
    genres: [GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[14],
    hero_image: img(116, 1920, 800), thumbnail: img(116),
    content_tier: "free", tags: ["tech", "startup", "betrayal", "true-story"], score: 89,
  },
  {
    uid: "m17", content_type: "movie", title: "Get Out", slug: "get-out",
    synopsis: "A young African-American visits his white girlfriend's parents for the weekend, where his simmering uneasiness about their reception of him eventually reaches a boiling point.",
    release_date: "2017-02-24", runtime: 104, rating: "R",
    genres: [GENRES[5], GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[14],
    hero_image: img(117, 1920, 800), thumbnail: img(117),
    content_tier: "free", tags: ["horror", "race", "oscar-winner", "thriller"], score: 98,
  },
  {
    uid: "m18", content_type: "movie", title: "Blade Runner 2049", slug: "blade-runner-2049",
    synopsis: "A young blade runner's discovery of a long-buried secret leads him to track down former blade runner Rick Deckard, who's been missing for thirty years.",
    release_date: "2017-10-06", runtime: 164, rating: "R",
    genres: [GENRES[2], GENRES[5]], cast: [PEOPLE[5]], director: PEOPLE[4],
    hero_image: img(118, 1920, 800), thumbnail: img(118),
    content_tier: "premium", tags: ["cyberpunk", "dystopia", "neo-noir", "ai"], score: 88,
  },
  {
    uid: "m19", content_type: "movie", title: "Arrival", slug: "arrival",
    synopsis: "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
    release_date: "2016-11-11", runtime: 116, rating: "PG-13",
    genres: [GENRES[2], GENRES[1]], cast: [PEOPLE[3]], director: PEOPLE[4],
    hero_image: img(119, 1920, 800), thumbnail: img(119),
    content_tier: "free", tags: ["aliens", "language", "time", "cerebral"], score: 94,
  },
  {
    uid: "m20", content_type: "movie", title: "The Shawshank Redemption", slug: "the-shawshank-redemption",
    synopsis: "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
    release_date: "1994-09-23", runtime: 142, rating: "R",
    genres: [GENRES[1]], cast: [PEOPLE[1]], director: PEOPLE[14],
    hero_image: img(120, 1920, 800), thumbnail: img(120),
    content_tier: "free", tags: ["prison", "hope", "friendship", "classic"], score: 99,
  },
];

// ─── TV Series ────────────────────────────────────────────────────────────────

export const TV_SERIES: TvSeries[] = [
  {
    uid: "s1", content_type: "tv_series", title: "Breaking Bad", slug: "breaking-bad",
    synopsis: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    release_date: "2008-01-20", rating: "TV-MA",
    genres: [GENRES[1], GENRES[5]], cast: [PEOPLE[8], PEOPLE[9]], creator: PEOPLE[7],
    hero_image: img(201, 1920, 800), thumbnail: img(201),
    status: "ended", content_tier: "free", tags: ["crime", "drug", "transformation", "best-drama"], score: 99,
    seasons: [
      {
        uid: "s1s1", season_number: 1, release_date: "2008-01-20",
        episodes: [
          { uid: "s1s1e1", title: "Pilot", slug: "pilot", episode_number: 1, duration: 58, synopsis: "Walter White, a chemistry teacher, learns he has terminal cancer.", thumbnail: img(211), air_date: "2008-01-20" },
          { uid: "s1s1e2", title: "Cat's in the Bag", slug: "cats-in-the-bag", episode_number: 2, duration: 48, synopsis: "Walt and Jesse try to dispose of the bodies left from the botched deal.", thumbnail: img(212), air_date: "2008-01-27" },
          { uid: "s1s1e3", title: "...And the Bag's in the River", slug: "and-the-bags-in-the-river", episode_number: 3, duration: 48, synopsis: "Walter struggles with his decision to eliminate Emilio and Krazy-8.", thumbnail: img(213), air_date: "2008-02-10" },
        ],
      },
      {
        uid: "s1s2", season_number: 2, release_date: "2009-03-08",
        episodes: [
          { uid: "s1s2e1", title: "Seven Thirty-Seven", slug: "seven-thirty-seven", episode_number: 1, duration: 47, synopsis: "Walt and Jesse plan their next move while dealing with Tuco.", thumbnail: img(214), air_date: "2009-03-08" },
          { uid: "s1s2e2", title: "Grilled", slug: "grilled", episode_number: 2, duration: 47, synopsis: "Walt and Jesse find themselves at Tuco's remote hideout.", thumbnail: img(215), air_date: "2009-03-15" },
          { uid: "s1s2e3", title: "Bit by a Dead Bee", slug: "bit-by-a-dead-bee", episode_number: 3, duration: 47, synopsis: "Walt and Jesse deal with the aftermath of their encounter with Tuco.", thumbnail: img(216), air_date: "2009-03-22" },
        ],
      },
    ],
  },
  {
    uid: "s2", content_type: "tv_series", title: "Stranger Things", slug: "stranger-things",
    synopsis: "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.",
    release_date: "2016-07-15", rating: "TV-14",
    genres: [GENRES[2], GENRES[5]], cast: [PEOPLE[11]], creator: PEOPLE[10],
    hero_image: img(202, 1920, 800), thumbnail: img(202),
    status: "ended", content_tier: "free", tags: ["80s", "kids", "supernatural", "upside-down"], score: 93,
    seasons: [
      {
        uid: "s2s1", season_number: 1, release_date: "2016-07-15",
        episodes: [
          { uid: "s2s1e1", title: "The Vanishing of Will Byers", slug: "the-vanishing-of-will-byers", episode_number: 1, duration: 47, synopsis: "On his way home from a friend's house, young Will sees something terrifying.", thumbnail: img(221), air_date: "2016-07-15" },
          { uid: "s2s1e2", title: "The Weirdo on Maple Street", slug: "the-weirdo-on-maple-street", episode_number: 2, duration: 55, synopsis: "Lucas, Mike and Dustin try to talk to the girl they found in the woods.", thumbnail: img(222), air_date: "2016-07-15" },
          { uid: "s2s1e3", title: "Holly, Jolly", slug: "holly-jolly", episode_number: 3, duration: 51, synopsis: "An increasingly concerned Joyce sees what she believes is Will trying to communicate with her.", thumbnail: img(223), air_date: "2016-07-15" },
        ],
      },
      {
        uid: "s2s2", season_number: 2, release_date: "2017-10-27",
        episodes: [
          { uid: "s2s2e1", title: "MADMAX", slug: "madmax", episode_number: 1, duration: 48, synopsis: "As the town preps for Halloween, a high-scoring rival shakes things up.", thumbnail: img(224), air_date: "2017-10-27" },
          { uid: "s2s2e2", title: "Trick or Treat, Freak", slug: "trick-or-treat-freak", episode_number: 2, duration: 56, synopsis: "After Will sees something terrible on Trick or Treat night, Mike and Eleven reconnect.", thumbnail: img(225), air_date: "2017-10-27" },
          { uid: "s2s2e3", title: "The Pollywog", slug: "the-pollywog", episode_number: 3, duration: 51, synopsis: "Dustin discovers something exciting, but Eleven grows more restless at the cabin.", thumbnail: img(226), air_date: "2017-10-27" },
        ],
      },
    ],
  },
  {
    uid: "s3", content_type: "tv_series", title: "The Bear", slug: "the-bear",
    synopsis: "A young chef from the fine dining world comes home to Chicago to run his family's sandwich shop.",
    release_date: "2022-06-23", rating: "TV-MA",
    genres: [GENRES[1], GENRES[3]], cast: [PEOPLE[13]], creator: PEOPLE[12],
    hero_image: img(203, 1920, 800), thumbnail: img(203),
    status: "ongoing", content_tier: "premium", tags: ["chef", "restaurant", "anxiety", "family"], score: 97,
    seasons: [
      {
        uid: "s3s1", season_number: 1, release_date: "2022-06-23",
        episodes: [
          { uid: "s3s1e1", title: "System", slug: "system", episode_number: 1, duration: 37, synopsis: "Carmy returns to Chicago to run the family beef sandwich restaurant after his brother's death.", thumbnail: img(231), air_date: "2022-06-23" },
          { uid: "s3s1e2", title: "Hands", slug: "hands", episode_number: 2, duration: 23, synopsis: "Carmy deals with the kitchen chaos as he tries to modernize the restaurant.", thumbnail: img(232), air_date: "2022-06-23" },
          { uid: "s3s1e3", title: "Brigade", slug: "brigade", episode_number: 3, duration: 27, synopsis: "Carmy introduces new kitchen hierarchy protocols as tensions mount.", thumbnail: img(233), air_date: "2022-06-23" },
        ],
      },
      {
        uid: "s3s2", season_number: 2, release_date: "2023-06-22",
        episodes: [
          { uid: "s3s2e1", title: "Beef", slug: "beef", episode_number: 1, duration: 37, synopsis: "The team embarks on a quest to build a new restaurant.", thumbnail: img(234), air_date: "2023-06-22" },
          { uid: "s3s2e2", title: "Pasta", slug: "pasta", episode_number: 2, duration: 29, synopsis: "Marcus travels to Copenhagen to sharpen his pastry skills.", thumbnail: img(235), air_date: "2023-06-22" },
          { uid: "s3s2e3", title: "Fish", slug: "fish", episode_number: 3, duration: 24, synopsis: "The kitchen prepares for an important preview night.", thumbnail: img(236), air_date: "2023-06-22" },
        ],
      },
    ],
  },
];

// ─── All Titles ───────────────────────────────────────────────────────────────

export const ALL_TITLES: (Movie | TvSeries)[] = [...MOVIES, ...TV_SERIES];

export function getTitleBySlug(slug: string): Movie | TvSeries | undefined {
  return ALL_TITLES.find((t) => t.slug === slug);
}

export function getTitlesByGenre(genreSlug: string): (Movie | TvSeries)[] {
  return ALL_TITLES.filter((t) => t.genres.some((g) => g.slug === genreSlug));
}

export function getGenreBySlug(slug: string): Genre | undefined {
  return GENRES.find((g) => g.slug === slug);
}

export function searchTitles(query: string): (Movie | TvSeries)[] {
  const q = query.toLowerCase();
  return ALL_TITLES.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.synopsis.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)) ||
      t.genres.some((g) => g.title.toLowerCase().includes(q))
  );
}

export function getFeaturedTitles(): (Movie | TvSeries)[] {
  return [MOVIES[0], MOVIES[3], TV_SERIES[2], MOVIES[10], TV_SERIES[0]];
}

export function getTrendingTitles(): (Movie | TvSeries)[] {
  return [...ALL_TITLES].sort((a, b) => b.score - a.score).slice(0, 10);
}

export function getNewTitles(): (Movie | TvSeries)[] {
  return [...ALL_TITLES]
    .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
    .slice(0, 8);
}

// ─── Hero Banners ─────────────────────────────────────────────────────────────

export const HERO_BANNERS: HeroBanner[] = [
  {
    uid: "h1", title: "Dune: Part Two", subtitle: "The legend becomes the messiah.",
    cta_label: "Watch Now", cta_url: "/watch/dune-part-two",
    background_image: img(105, 1920, 800), badge_text: "Now Streaming",
    linked_title: MOVIES[4],
  },
  {
    uid: "h2", title: "The Bear", subtitle: "Every second counts in the kitchen.",
    cta_label: "Start Watching", cta_url: "/watch/the-bear",
    background_image: img(203, 1920, 800), badge_text: "Award Winner",
    linked_title: TV_SERIES[2],
  },
  {
    uid: "h3", title: "Oppenheimer", subtitle: "The world forever changed.",
    cta_label: "Watch Now", cta_url: "/watch/oppenheimer",
    background_image: img(111, 1920, 800), badge_text: "Oscar Winner",
    linked_title: MOVIES[10],
  },
];

// ─── Homepage Rails ───────────────────────────────────────────────────────────

export const HOMEPAGE_RAILS: HomepageRail[] = [
  {
    uid: "r1", title: "Trending Now", rail_type: "automated",
    items: getTrendingTitles().slice(0, 8), layout: "landscape",
  },
  {
    uid: "r2", title: "New on Flixstack", rail_type: "automated",
    items: getNewTitles(), layout: "landscape",
  },
  {
    uid: "r3", title: "Top Sci-Fi", rail_type: "editorial",
    items: getTitlesByGenre("sci-fi").slice(0, 6), layout: "landscape",
  },
  {
    uid: "r4", title: "Award Winners", rail_type: "editorial",
    items: ALL_TITLES.filter((t) => t.tags.includes("oscar-winner")).slice(0, 6), layout: "portrait",
  },
  {
    uid: "r5", title: "Action Hits", rail_type: "automated",
    items: getTitlesByGenre("action").slice(0, 8), layout: "landscape",
  },
];
