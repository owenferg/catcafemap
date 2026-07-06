import { readFile } from "node:fs/promises";

const MANUAL_INPUT_PATH = "data/manual/cat-cafes.csv";
const REVIEW_PATH = "data/manual/osm-review.csv";
const REVIEW_NOTES_PATH = "data/manual/review-notes.csv";
const BASELINE_REVIEW_PATH = "data/manual/baseline-review.csv";
const GEOJSON_PATH = "public/data/cat-cafes.geojson";
const MAX_VERIFICATION_AGE_DAYS = 90;
const DUPLICATE_DISTANCE_METERS = 250;
const INTERACTION_EVIDENCE_PATTERN =
  /adopt|cat room|cat lounge|visit.*cat|cats?.*visit|interact|spend time|reservation|reserve|book/i;

type Row = Record<string, string>;

type Feature = {
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
  properties?: Record<string, unknown>;
};

type FeatureCollection = {
  type?: string;
  features?: Feature[];
};

function parseCsv(content: string): Row[] {
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

function isStale(date: string): boolean {
  const verified = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(verified)) {
    return true;
  }

  const ageMs = Date.now() - verified;
  return ageMs > MAX_VERIFICATION_AGE_DAYS * 24 * 60 * 60 * 1000;
}

async function readRows(path: string): Promise<Row[]> {
  try {
    return parseCsv(await readFile(path, "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function distanceMeters(a: Feature, b: Feature): number | undefined {
  const aCoordinates = a.geometry?.coordinates;
  const bCoordinates = b.geometry?.coordinates;
  if (
    !Array.isArray(aCoordinates) ||
    !Array.isArray(bCoordinates) ||
    typeof aCoordinates[0] !== "number" ||
    typeof aCoordinates[1] !== "number" ||
    typeof bCoordinates[0] !== "number" ||
    typeof bCoordinates[1] !== "number"
  ) {
    return undefined;
  }

  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(bCoordinates[1] - aCoordinates[1]);
  const deltaLon = toRadians(bCoordinates[0] - aCoordinates[0]);
  const lat1 = toRadians(aCoordinates[1]);
  const lat2 = toRadians(bCoordinates[1]);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function propertyString(feature: Feature, key: string): string {
  const value = feature.properties?.[key];
  return typeof value === "string" ? value : "";
}

function findClosePairs(features: Feature[]): string[] {
  const pairs: string[] = [];

  for (let left = 0; left < features.length; left += 1) {
    for (let right = left + 1; right < features.length; right += 1) {
      const distance = distanceMeters(features[left], features[right]);
      if (distance !== undefined && distance <= DUPLICATE_DISTANCE_METERS) {
        pairs.push(
          `${propertyString(features[left], "name")} / ${propertyString(
            features[right],
            "name",
          )} (${Math.round(distance)}m)`,
        );
      }
    }
  }

  return pairs;
}

async function main(): Promise<void> {
  const [manualRows, reviewRows, reviewNoteRows, baselineReviewRows, geojson] = await Promise.all([
    readRows(MANUAL_INPUT_PATH),
    readRows(REVIEW_PATH),
    readRows(REVIEW_NOTES_PATH),
    readRows(BASELINE_REVIEW_PATH),
    readJson<FeatureCollection>(GEOJSON_PATH),
  ]);
  const activeRows = manualRows.filter((row) => (row.status || "active") === "active");
  const missingSource = activeRows.filter((row) => !row.website || !row.source_url);
  const stale = activeRows.filter((row) => !row.verified_at || isStale(row.verified_at));
  const weakInteractionEvidence = activeRows.filter(
    (row) => !INTERACTION_EVIDENCE_PATTERN.test(row.notes),
  );
  const notedReviewUrls = new Set(reviewNoteRows.map((row) => row.source_url));
  const reviewUrls = new Set(reviewRows.map((row) => row.source_url));
  const unnotedReviewRows = reviewRows.filter((row) => !notedReviewUrls.has(row.source_url));
  const staleReviewNotes = reviewNoteRows.filter((row) => !reviewUrls.has(row.source_url));
  const pendingBaselineReviewRows = baselineReviewRows.filter(
    (row) => (row.status || "pending") === "pending",
  );
  const features = geojson.features ?? [];
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  const incompleteFeatures = features.filter((feature) =>
    ["id", "name", "address", "city", "region", "country", "website", "source_url", "verified_at"].some(
      (key) => !propertyString(feature, key),
    ),
  );
  const invalidCoordinateFeatures = features.filter((feature) => {
    const coordinates = feature.geometry?.coordinates;
    return (
      feature.geometry?.type !== "Point" ||
      !Array.isArray(coordinates) ||
      typeof coordinates[0] !== "number" ||
      typeof coordinates[1] !== "number" ||
      coordinates[0] < -180 ||
      coordinates[0] > 180 ||
      coordinates[1] < -90 ||
      coordinates[1] > 90
    );
  });
  const closePairs = findClosePairs(features);

  for (const feature of features) {
    const id = propertyString(feature, "id");
    if (seenIds.has(id)) {
      duplicateIds.add(id);
    }
    seenIds.add(id);
  }

  console.log(`Active curated cafes: ${activeRows.length}`);
  console.log(`Published GeoJSON features: ${features.length}`);
  console.log(`Published incomplete features: ${incompleteFeatures.length}`);
  console.log(`Published invalid coordinate features: ${invalidCoordinateFeatures.length}`);
  console.log(`Published duplicate IDs: ${duplicateIds.size}`);
  console.log(`Published close-coordinate pairs: ${closePairs.length}`);
  console.log(`OSM candidates needing review: ${reviewRows.length}`);
  console.log(`OSM candidates with review notes: ${reviewNoteRows.length}`);
  console.log(`OSM candidates missing review notes: ${unnotedReviewRows.length}`);
  console.log(`OSM review notes without candidates: ${staleReviewNotes.length}`);
  console.log(`External baseline candidates needing review: ${pendingBaselineReviewRows.length}`);
  console.log(`Active cafes missing website/source_url: ${missingSource.length}`);
  console.log(`Active cafes stale or unverified: ${stale.length}`);
  console.log(`Active cafes needing interaction/adoption evidence notes: ${weakInteractionEvidence.length}`);

  for (const row of unnotedReviewRows.slice(0, 20)) {
    console.log(`unnoted: ${row.name} (${row.source_url})`);
  }

  for (const row of staleReviewNotes.slice(0, 20)) {
    console.log(`stale review note: ${row.name} (${row.source_url})`);
  }

  for (const row of pendingBaselineReviewRows.slice(0, 20)) {
    console.log(`baseline review: ${row.name} (${row.city}, ${row.region}) - ${row.reason}`);
  }

  for (const row of stale.slice(0, 20)) {
    console.log(`stale: ${row.name} (${row.city}, ${row.region})`);
  }

  for (const feature of incompleteFeatures.slice(0, 20)) {
    console.log(`incomplete feature: ${propertyString(feature, "name")}`);
  }

  for (const row of weakInteractionEvidence.slice(0, 20)) {
    console.log(`needs interaction evidence: ${row.name} (${row.city}, ${row.region})`);
  }

  for (const pair of closePairs.slice(0, 20)) {
    console.log(`close pair: ${pair}`);
  }

  if (stale.length > 20) {
    console.log(`...and ${stale.length - 20} more stale records`);
  }

  const failures = [
    missingSource.length > 0 && "active cafes missing website/source_url",
    stale.length > 0 && "active cafes stale or unverified",
    unnotedReviewRows.length > 0 && "OSM candidates missing review notes",
    staleReviewNotes.length > 0 && "OSM review notes without candidates",
    incompleteFeatures.length > 0 && "published GeoJSON features incomplete",
    invalidCoordinateFeatures.length > 0 && "published GeoJSON features have invalid coordinates",
    duplicateIds.size > 0 && "published GeoJSON duplicate IDs",
    closePairs.length > 0 && "published GeoJSON close-coordinate pairs",
  ].filter(Boolean);

  if (failures.length > 0) {
    throw new Error(`Data audit failed: ${failures.join("; ")}.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
