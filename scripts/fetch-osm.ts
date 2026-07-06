import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OUTPUT_PATH = "data/raw/osm-cat-cafes.json";
const SENSITIVE_TAGS = new Set([
  "contact:email",
  "contact:fax",
  "contact:phone",
  "email",
  "fax",
  "internet_access:password",
  "internet_access:ssid",
  "phone",
]);

type OsmResponse = {
  elements?: Array<{
    tags?: Record<string, string>;
    [key: string]: unknown;
  }>;
};

const query = `[out:json][timeout:90];
(
  nwr["amenity"="cafe"]["theme"="cat"](24.0,-141.0,72.0,-52.0);
  nwr["cafe"="cat_cafe"](24.0,-141.0,72.0,-52.0);
);
out center tags;`;

function stripSensitiveTags(json: OsmResponse): OsmResponse {
  return {
    ...json,
    elements: json.elements?.map((element) => {
      if (!element.tags) {
        return element;
      }

      const tags = Object.fromEntries(
        Object.entries(element.tags).filter(([key]) => !SENSITIVE_TAGS.has(key)),
      );

      return { ...element, tags };
    }),
  };
}

async function main(): Promise<void> {
  const body = new URLSearchParams({ data: query });

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "catcafemap-poc/0.1 (local development)",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Overpass request failed (${response.status}): ${text}`);
  }

  const json = stripSensitiveTags((await response.json()) as OsmResponse);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(json, null, 2)}\n`);

  console.log(`Fetched ${json.elements?.length ?? 0} OSM cat cafe elements.`);
  console.log(`Saved ${OUTPUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
