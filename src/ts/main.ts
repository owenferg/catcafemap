import "mapbox-gl/dist/mapbox-gl.css";
import "../css/main.css";
import "../css/side-panel.css";
import { addCafeMarkers, clearCafeMarkerHighlight, highlightCafeMarker } from "./map-layers";
import { createMap, fitMapToCafes, flyToCafe } from "./map";
import { setupSearchPanel } from "./search-panel";
import { createSidePanel } from "./side-panel";
import type { CatCafeCollection } from "./types";

const statusElement = document.querySelector<HTMLDivElement>("#status");
const searchInput = document.querySelector<HTMLInputElement>("#cafe-search");
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

  const map = createMap(token);
  const sidePanel = createSidePanel({
    searchInput,
    resultsPanel: document.querySelector<HTMLDivElement>("#results-panel"),
    cafeInfoPanel: document.querySelector<HTMLDivElement>("#cafe-info-panel"),
    panelStatus: document.querySelector<HTMLDivElement>("#panel-status"),
    onSelect(feature) {
      highlightCafeMarker(feature);
      flyToCafe(map, feature);
    },
    onDeselect() {
      clearCafeMarkerHighlight();
    },
  });

  try {
    const geojson = await loadCafes();
    const cafes = geojson.features;

    if (cafes.length === 0) {
      setStatus("No cat cafes found in public/data/cat-cafes.geojson.");
      return;
    }

    sidePanel.setCafes(cafes);
    addCafeMarkers(map, cafes, (feature) => sidePanel.selectCafe(feature, true));
    fitMapToCafes(map, cafes);
    setupSearchPanel({
      input: searchInput,
      onQueryChange(hasQuery) {
        sidePanel.setResultsOpen(hasQuery);
        sidePanel.renderResults();
      },
      onFocusWithQuery() {
        sidePanel.setResultsOpen(true);
        sidePanel.renderResults();
      },
    });

    sidePanel.renderCafeInfo();
    sidePanel.renderResults();
    setStatus(`Loaded ${cafes.length} cat cafes.`);
    window.setTimeout(clearStatus, 2500);
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : "Failed to load cat cafes.");
  }
}

void main();
