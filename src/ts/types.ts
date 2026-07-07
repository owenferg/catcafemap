export type CatCafeFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    id?: string;
    name?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    image_url?: string;
    image_source_url?: string;
    price_text?: string;
    price_source_url?: string;
    enriched_at?: string;
    website?: string;
    source_url?: string;
    source?: string;
    verified_at?: string;
    verified_date?: string;
  }
>;

export type CatCafeCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  CatCafeFeature["properties"]
>;

export function cafeKey(feature: CatCafeFeature): string {
  const props = feature.properties;
  return props.id || `${props.name}-${props.city}-${props.region}`;
}

export function cafeCoordinates(feature: CatCafeFeature): [number, number] {
  return feature.geometry.coordinates as [number, number];
}
