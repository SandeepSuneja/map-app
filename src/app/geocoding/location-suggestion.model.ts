export interface SearchSuggestion {
  title: string;
  display: string;
  subtext: string;
  lat: number;
  lon: number;
}

interface PhotonProperties {
  name?: string;
  street?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
}

interface PhotonFeature {
  geometry: { type: string; coordinates: [number, number] };
  properties: PhotonProperties;
}

export interface PhotonResponse {
  features: PhotonFeature[];
}

export function suggestionFromFeature(f: PhotonFeature): SearchSuggestion | null {
  const coords = f.geometry?.coordinates;
  if (!coords) {
    return null;
  }
  const [lon, lat] = coords;
  const p = f.properties;
  const title = p.name || p.street || p.city || p.country;
  if (!title) {
    return null;
  }
  const area = [p.city || p.district, p.state, p.country].filter(Boolean).join(', ');
  const street =
    p.street && p.street !== p.name && p.street !== p.city ? p.street : '';
  const subtext = [street, area].filter(Boolean).join(' · ');
  const display =
    area && !title.includes(area) ? `${title}, ${area}` : street ? `${title}, ${street}` : title;
  return { title, display, subtext, lat, lon };
}
