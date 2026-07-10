import { getAllTitles, getAllGenres, parseLivePreviewParams } from "@/lib/contentstack/queries";
import { BrowseClient } from "./browse-client";

interface BrowsePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const livePreview = parseLivePreviewParams(await searchParams);
  const [titles, genres] = await Promise.all([
    getAllTitles(livePreview),
    getAllGenres(livePreview),
  ]);

  return <BrowseClient titles={titles} genres={genres} />;
}
