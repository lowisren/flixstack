// Shared, secret-free region config — safe to import from both server and client code.
import { Region } from "@contentstack/delivery-sdk";

export const REGION_MAP: Record<string, Region> = {
  US: Region.US,
  EU: Region.EU,
  AU: Region.AU,
  AZURE_NA: Region.AZURE_NA,
  AZURE_EU: Region.AZURE_EU,
  GCP_NA: Region.GCP_NA,
  GCP_EU: Region.GCP_EU,
};

export const PREVIEW_HOST_MAP: Record<string, string> = {
  US: "rest-preview.contentstack.com",
  EU: "eu-rest-preview.contentstack.com",
  AZURE_NA: "azure-na-rest-preview.contentstack.com",
  AZURE_EU: "azure-eu-rest-preview.contentstack.com",
  GCP_NA: "gcp-na-rest-preview.contentstack.com",
  GCP_EU: "gcp-eu-rest-preview.contentstack.com",
};
