import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const OSM_INPUT_PATH = "data/raw/osm-cat-cafes.json";
const MANUAL_INPUT_PATH = "data/manual/cat-cafes.csv";
const EXCLUSIONS_INPUT_PATH = "data/manual/exclusions.csv";
const CACHE_PATH = "data/cache/geocode.json";
const FAILURES_PATH = "data/manual/geocode-failures.csv";
const REVIEW_PATH = "data/manual/osm-review.csv";
const OUTPUT_PATH = "public/data/cat-cafes.geojson";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

type Country = "US" | "CA";
type Source = "osm" | "manual" | "merged";
type Status = "active" | "closed" | "duplicate" | "not_cat_cafe" | "unverified";

type CafeRecord = {
  id?: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: Country;
  website?: string;
  source_url?: string;
  lat?: number;
  lon?: number;
  source: Source;
  status?: Status;
  verified_at?: string;
  notes?: string;
  osm_id?: number;
  osm_type?: string;
};

type ManualRow = Record<string, string>;

type OsmElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type GeocodeCache = Record<string, { lat: number; lon: number } | null>;

type FeatureProperties = {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: Country;
  website?: string;
  source_url?: string;
  source: Source;
  verified_at?: string;
  osm_id?: number;
  osm_type?: string;
};

type Exclusion = {
  name: string;
  city: string;
  region: string;
  country: string;
  reason: string;
  source_url?: string;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsv(content: string): ManualRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) {
    return [];
  }

  return dataRows
    .filter((dataRow) => dataRow.some((value) => value.trim().length > 0))
    .map((dataRow) =>
      Object.fromEntries(
        headers.map((header, index) => [header.trim(), dataRow[index]?.trim() ?? ""]),
      ),
    );
}

function parseCoordinate(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requireCountry(value: string): Country {
  if (value === "US" || value === "CA") {
    return value;
  }

  throw new Error(`Unsupported country "${value}". Expected US or CA.`);
}

function requireStatus(value: string | undefined): Status {
  if (!value) {
    return "active";
  }

  if (
    value === "active" ||
    value === "closed" ||
    value === "duplicate" ||
    value === "not_cat_cafe" ||
    value === "unverified"
  ) {
    return value;
  }

  throw new Error(`Unsupported status "${value}".`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(cat|cats|cafe|catfe|coffee|house|lounge|adoption|rescue)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function distanceMeters(a: CafeRecord, b: CafeRecord): number | undefined {
  if (
    a.lat === undefined ||
    a.lon === undefined ||
    b.lat === undefined ||
    b.lon === undefined
  ) {
    return undefined;
  }

  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function isDuplicate(a: CafeRecord, b: CafeRecord): boolean {
  const distance = distanceMeters(a, b);
  if (distance !== undefined && distance <= 200) {
    return true;
  }

  return (
    normalizeName(a.name) === normalizeName(b.name) &&
    a.city.toLowerCase() === b.city.toLowerCase() &&
    a.region.toLowerCase() === b.region.toLowerCase()
  );
}

function mergeRecords(existing: CafeRecord, incoming: CafeRecord): CafeRecord {
  const manual = existing.source === "manual" ? existing : incoming;
  const osm = existing.source === "osm" ? existing : incoming;

  if (existing.source === "merged" || incoming.source === "merged") {
    return {
      ...existing,
      ...Object.fromEntries(
        Object.entries(incoming).filter(([, value]) => value !== undefined && value !== ""),
      ),
      source: "merged",
      lat: existing.lat ?? incoming.lat,
      lon: existing.lon ?? incoming.lon,
    };
  }

  if (existing.source !== incoming.source) {
    return {
      ...osm,
      ...manual,
      lat: osm.lat ?? manual.lat,
      lon: osm.lon ?? manual.lon,
      source: "merged",
    };
  }

  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(incoming).filter(([, value]) => value !== undefined && value !== ""),
    ),
  };
}

async function readJsonFile<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function readManualRows(): Promise<CafeRecord[]> {
  const content = await readFile(MANUAL_INPUT_PATH, "utf8");
  const rows = parseCsv(content);

  return rows.map((row, index) => {
    for (const column of ["name", "address", "city", "region", "country"]) {
      if (!row[column]) {
        throw new Error(`Manual CSV row ${index + 2} is missing ${column}.`);
      }
    }

    return {
      name: row.name,
      address: row.address,
      city: row.city,
      region: row.region,
      country: requireCountry(row.country),
      website: row.website || undefined,
      source_url: row.source_url || undefined,
      lat: parseCoordinate(row.lat),
      lon: parseCoordinate(row.lon),
      source: "manual",
      status: requireStatus(row.status),
      verified_at: row.verified_at || undefined,
      notes: row.notes || undefined,
    };
  });
}

async function readExclusions(): Promise<Exclusion[]> {
  try {
    const rows = parseCsv(await readFile(EXCLUSIONS_INPUT_PATH, "utf8"));
    return rows.map((row) => ({
      name: row.name,
      city: row.city,
      region: row.region,
      country: row.country,
      reason: row.reason,
      source_url: row.source_url || undefined,
    }));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function osmAddress(tags: Record<string, string>): string {
  return [
    tags["addr:housenumber"],
    tags["addr:street"],
  ]
    .filter(Boolean)
    .join(" ");
}

function inferCountry(tags: Record<string, string>, region: string): Country {
  const country = tags["addr:country"]?.toUpperCase();
  const website = tags.website ?? tags["contact:website"] ?? "";
  const canadianRegions = new Set([
    "AB",
    "BC",
    "MB",
    "NB",
    "NL",
    "NS",
    "NT",
    "NU",
    "ON",
    "PE",
    "QC",
    "SK",
    "YT",
  ]);

  if (
    country === "CA" ||
    canadianRegions.has(region.toUpperCase()) ||
    /\.ca(\/|$)/i.test(website)
  ) {
    return "CA";
  }

  return "US";
}

function normalizeOsmElement(element: OsmElement): CafeRecord | undefined {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const name = tags.name;

  if (!name || lat === undefined || lon === undefined) {
    return undefined;
  }

  const region = tags["addr:state"] ?? tags["addr:province"] ?? "";
  const country = inferCountry(tags, region);
  const city = tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"] ?? "";

  return {
    name,
    address: osmAddress(tags),
    city,
    region,
    country,
    website: tags.website ?? tags["contact:website"],
    source_url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    lat,
    lon,
    source: "osm",
    osm_id: element.id,
    osm_type: element.type,
  };
}

async function readOsmRows(): Promise<CafeRecord[]> {
  const raw = await readJsonFile<{ elements?: OsmElement[] }>(OSM_INPUT_PATH, {
    elements: [],
  });

  return (raw.elements ?? [])
    .map(normalizeOsmElement)
    .filter((record): record is CafeRecord => record !== undefined);
}

function dedupe(records: CafeRecord[]): CafeRecord[] {
  const merged: CafeRecord[] = [];

  for (const record of records) {
    const existingIndex = merged.findIndex((candidate) => isDuplicate(candidate, record));
    if (existingIndex === -1) {
      merged.push(record);
    } else {
      merged[existingIndex] = mergeRecords(merged[existingIndex], record);
    }
  }

  return merged;
}

function matchesExclusion(record: CafeRecord, exclusion: Exclusion): boolean {
  if (exclusion.source_url && record.source_url === exclusion.source_url) {
    return true;
  }

  return (
    normalizeName(record.name) === normalizeName(exclusion.name) &&
    record.city.toLowerCase() === exclusion.city.toLowerCase() &&
    record.region.toLowerCase() === exclusion.region.toLowerCase() &&
    record.country === exclusion.country
  );
}

function isPublishable(record: CafeRecord, exclusions: Exclusion[]): boolean {
  if (exclusions.some((exclusion) => matchesExclusion(record, exclusion))) {
    return false;
  }

  return record.status === "active" && Boolean(record.verified_at);
}

function needsReview(record: CafeRecord, exclusions: Exclusion[]): boolean {
  return (
    record.source === "osm" &&
    !exclusions.some((exclusion) => matchesExclusion(record, exclusion))
  );
}

function geocodeQuery(record: CafeRecord): string {
  return [record.address, record.city, record.region, record.country]
    .filter(Boolean)
    .join(", ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function geocode(
  record: CafeRecord,
  cache: GeocodeCache,
): Promise<{ lat: number; lon: number } | null> {
  const query = geocodeQuery(record);
  if (query in cache) {
    return cache[query];
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "catcafemap-poc/0.1 (local development)",
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed (${response.status}) for ${query}.`);
  }

  const results = (await response.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];
  const result = first
    ? { lat: Number(first.lat), lon: Number(first.lon) }
    : null;

  cache[query] = result;
  await sleep(1100);
  return result;
}

async function geocodeMissing(records: CafeRecord[]): Promise<{
  records: CafeRecord[];
  attempted: number;
  successes: number;
  failures: CafeRecord[];
}> {
  const cache = await readJsonFile<GeocodeCache>(CACHE_PATH, {});
  const failures: CafeRecord[] = [];
  let attempted = 0;
  let successes = 0;

  for (const record of records) {
    if (record.lat !== undefined && record.lon !== undefined) {
      continue;
    }

    attempted += 1;
    const result = await geocode(record, cache);
    if (result) {
      record.lat = result.lat;
      record.lon = result.lon;
      successes += 1;
    } else {
      failures.push(record);
    }
  }

  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
  await writeFailures(failures);

  return { records, attempted, successes, failures };
}

async function writeFailures(records: CafeRecord[]): Promise<void> {
  const header = ["name", "address", "city", "region", "country", "source"].join(",");
  const lines = records.map((record) =>
    [
      record.name,
      record.address,
      record.city,
      record.region,
      record.country,
      record.source,
    ]
      .map(csvEscape)
      .join(","),
  );

  await mkdir(dirname(FAILURES_PATH), { recursive: true });
  await writeFile(FAILURES_PATH, `${[header, ...lines].join("\n")}\n`);
}

async function writeOsmReview(records: CafeRecord[]): Promise<void> {
  const header = [
    "name",
    "address",
    "city",
    "region",
    "country",
    "website",
    "source_url",
    "lat",
    "lon",
  ].join(",");
  const lines = records.map((record) =>
    [
      record.name,
      record.address,
      record.city,
      record.region,
      record.country,
      record.website ?? "",
      record.source_url ?? "",
      record.lat?.toString() ?? "",
      record.lon?.toString() ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  await mkdir(dirname(REVIEW_PATH), { recursive: true });
  await writeFile(REVIEW_PATH, `${[header, ...lines].join("\n")}\n`);
}

function assignIds(records: CafeRecord[]): CafeRecord[] {
  const counts = new Map<string, number>();

  return records.map((record) => {
    const base = slugify(`${record.name}-${record.city || record.region}`);
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);

    return {
      ...record,
      id: count === 0 ? base : `${base}-${count + 1}`,
    };
  });
}

function toGeoJson(records: CafeRecord[]): GeoJSON.FeatureCollection<GeoJSON.Point, FeatureProperties> {
  return {
    type: "FeatureCollection",
    features: records
      .filter(
        (record): record is CafeRecord & { id: string; lat: number; lon: number } =>
          Boolean(record.id) && record.lat !== undefined && record.lon !== undefined,
      )
      .sort((a, b) => a.name.localeCompare(b.name) || a.city.localeCompare(b.city))
      .map((record) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [record.lon, record.lat],
        },
        properties: {
          id: record.id,
          name: record.name,
          address: record.address,
          city: record.city,
          region: record.region,
          country: record.country,
          website: record.website,
          source_url: record.source_url,
          source: record.source,
          verified_at: record.verified_at,
          osm_id: record.osm_id,
          osm_type: record.osm_type,
        },
      })),
  };
}

async function main(): Promise<void> {
  const [osmRows, manualRows, exclusions] = await Promise.all([
    readOsmRows(),
    readManualRows(),
    readExclusions(),
  ]);
  const deduped = dedupe([...osmRows, ...manualRows]);
  const publishable = deduped.filter((record) => isPublishable(record, exclusions));
  const review = deduped.filter((record) => needsReview(record, exclusions));
  await writeOsmReview(review);
  const geocoded = await geocodeMissing(publishable);
  const withIds = assignIds(geocoded.records);
  const geojson = toGeoJson(withIds);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(geojson, null, 2)}\n`);

  console.log(`OSM records: ${osmRows.length}`);
  console.log(`Manual records: ${manualRows.length}`);
  console.log(`Exclusions: ${exclusions.length}`);
  console.log(`Deduped records: ${deduped.length}`);
  console.log(`Publishable records: ${publishable.length}`);
  console.log(`OSM review records: ${review.length}`);
  console.log(`Geocode attempts: ${geocoded.attempted}`);
  console.log(`Geocode successes: ${geocoded.successes}`);
  console.log(`Geocode failures: ${geocoded.failures.length}`);
  console.log(`GeoJSON features: ${geojson.features.length}`);
  console.log(`Saved ${OUTPUT_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
