import mapboxgl from "mapbox-gl";
import type { CatCafeFeature } from "./types";
import { cafeCoordinates } from "./types";

export function createMap(token: string): mapboxgl.Map {
  mapboxgl.accessToken = token;

  const map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v12",
    center: [-98, 45],
    zoom: 3,
  });

  map.addControl(new mapboxgl.NavigationControl(), "top-left");
  return map;
}

export function fitMapToCafes(map: mapboxgl.Map, cafes: CatCafeFeature[]): void {
  const bounds = new mapboxgl.LngLatBounds();
  for (const cafe of cafes) {
    bounds.extend(cafeCoordinates(cafe));
  }
  map.fitBounds(bounds, { padding: 48, maxZoom: 10 });
}

export function flyToCafe(map: mapboxgl.Map, cafe: CatCafeFeature): void {
  map.flyTo({ center: cafeCoordinates(cafe), zoom: Math.max(map.getZoom(), 12) });
}
