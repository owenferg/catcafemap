import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./style.css";

type CatCafeFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    id: string;
    name: string;
    address: string;
    city: string;
    region: string;
    country: "US" | "CA";
    website?: string;
    source_url?: string;
    source: "osm" | "manual" | "merged";
    verified_at?: string;
  }
>;

type CatCafeCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CatCafeFeature["properties"]
>;

const statusElement = document.querySelector<HTMLDivElement>("#status");
const token = import.meta.env.VITE_MAPBOX_TOKEN;

function setStatus(message: string): void {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function clearStatus(): void {
  if (statusElement) {
    statusElement.textContent = "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function popupHtml(feature: CatCafeFeature): string {
  const props = feature.properties;
  const address = [props.address, props.city, props.region, props.country]
    .filter(Boolean)
    .join(", ");
  const website = props.website
    ? `<p><a href="${escapeHtml(props.website)}" target="_blank" rel="noreferrer">Website</a></p>`
    : "";
  const verified = props.verified_at
    ? `<p>Verified: ${escapeHtml(props.verified_at)}</p>`
    : "";

  return `
    <div class="popup">
      <h2>${escapeHtml(props.name)}</h2>
      <p>${escapeHtml(address)}</p>
      <p>Source: ${escapeHtml(props.source)}</p>
      ${verified}
      ${website}
    </div>
  `;
}

async function loadCafes(): Promise<CatCafeCollection> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/cat-cafes.geojson`);
  if (!response.ok) {
    throw new Error(`Failed to load GeoJSON: ${response.status}`);
  }

  return (await response.json()) as CatCafeCollection;
}

async function main(): Promise<void> {
  if (!token) {
    setStatus("Missing VITE_MAPBOX_TOKEN. Add it to .env and restart Vite.");
    return;
  }

  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-98, 45],
    zoom: 3,
  });

  map.addControl(new mapboxgl.NavigationControl(), "top-right");

  try {
    const geojson = await loadCafes();

    if (geojson.features.length === 0) {
      setStatus("No cat cafes found in public/data/cat-cafes.geojson.");
      return;
    }

    const bounds = new mapboxgl.LngLatBounds();

    for (const feature of geojson.features) {
      const coordinates = feature.geometry.coordinates;
      bounds.extend(coordinates as [number, number]);

      new mapboxgl.Marker()
        .setLngLat(coordinates as [number, number])
        .setPopup(new mapboxgl.Popup({ offset: 24 }).setHTML(popupHtml(feature)))
        .addTo(map);
    }

    map.fitBounds(bounds, { padding: 48, maxZoom: 10 });
    setStatus(`Loaded ${geojson.features.length} cat cafes.`);
    window.setTimeout(clearStatus, 2500);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Failed to load cat cafes.");
  }
}

void main();
