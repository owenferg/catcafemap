import mapboxgl from "mapbox-gl";
import type { CatCafeFeature } from "./types";
import { cafeCoordinates, cafeKey } from "./types";

let selectedMarker: HTMLElement | undefined;

export function addCafeMarkers(
  map: mapboxgl.Map,
  cafes: CatCafeFeature[],
  onSelect: (cafe: CatCafeFeature) => void,
): void {
  for (const cafe of cafes) {
    const markerElement = document.createElement("button");
    markerElement.className = "map-marker";
    markerElement.type = "button";
    markerElement.dataset.cafeId = cafeKey(cafe);
    markerElement.setAttribute("aria-label", cafe.properties.name || "Cat cafe");
    markerElement.addEventListener("click", () => onSelect(cafe));

    new mapboxgl.Marker({ element: markerElement }).setLngLat(cafeCoordinates(cafe)).addTo(map);
  }
}

export function highlightCafeMarker(cafe: CatCafeFeature): void {
  selectedMarker?.classList.remove("selected");

  const marker = document.querySelector<HTMLElement>(
    `.map-marker[data-cafe-id="${CSS.escape(cafeKey(cafe))}"]`,
  );
  if (marker) {
    marker.classList.add("selected");
    selectedMarker = marker;
  }
}

export function clearCafeMarkerHighlight(): void {
  selectedMarker?.classList.remove("selected");
  selectedMarker = undefined;
}
