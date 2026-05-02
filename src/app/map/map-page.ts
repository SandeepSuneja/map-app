import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Observable, forkJoin, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { PhotonGeocodeService } from '../geocoding/photon-geocode.service';
import { LocationSuggestInputComponent } from '../location-suggest-input/location-suggest-input.component';

interface OsrmResponse {
  code: string;
  routes?: Array<{
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
  }>;
}

function fixLeafletDefaultIcons(): void {
  const proto = L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: string };
  delete proto._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

@Component({
  selector: 'app-map-page',
  imports: [FormsModule, LocationSuggestInputComponent],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPageComponent implements AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly photon = inject(PhotonGeocodeService);

  readonly maxWaypoints = 12;

  private map: L.Map | undefined;
  private routeOverlays: L.FeatureGroup | undefined;
  private searchMarker: L.Marker | undefined;
  private userMarker: L.Marker | undefined;
  private userLatLng: L.LatLng | undefined;

  searchText = '';
  useGpsAsStart = false;
  originText = '';
  destinationText = '';
  waypoints: string[] = [];

  protected readonly statusMessage = signal<string | null>(null);

  ngAfterViewInit(): void {
    fixLeafletDefaultIcons();
    const el = document.getElementById('map');
    if (!el) {
      return;
    }
    this.map = L.map(el).setView([-34.397, 150.644], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 0);
    this.locateUser();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
  }

  protected updateWaypoint(index: number, v: string): void {
    this.waypoints = this.waypoints.map((x, i) => (i === index ? v : x));
  }

  protected onMapSearchPicked(ev: { lat: number; lon: number; display: string }): void {
    this.showPlaceOnMap(ev.lat, ev.lon, ev.display);
    this.statusMessage.set('Showing selected place on the map.');
  }

  protected addWaypoint(): void {
    if (this.waypoints.length >= this.maxWaypoints) {
      return;
    }
    this.waypoints = [...this.waypoints, ''];
  }

  protected removeWaypoint(index: number): void {
    this.waypoints = this.waypoints.filter((_, i) => i !== index);
  }

  protected findOnMap(): void {
    const q = this.searchText.trim();
    if (!q) {
      this.statusMessage.set('Enter a place to search.');
      return;
    }
    this.statusMessage.set(null);
    this.photon.firstCoordinate(q).subscribe((c) => {
      if (!c || !this.map) {
        this.statusMessage.set('No results. Try a different search.');
        return;
      }
      this.showPlaceOnMap(c.lat, c.lon, q);
      this.statusMessage.set('Showing search result on the map.');
    });
  }

  protected buildRoute(): void {
    if (!this.map) {
      return;
    }
    const dest = this.destinationText.trim();
    if (!dest) {
      this.statusMessage.set('Enter a destination.');
      return;
    }

    const extraStops = this.waypoints.map((s) => s.trim()).filter(Boolean);

    const startObservables: Observable<{ lat: number; lon: number } | null>[] = [];

    if (this.useGpsAsStart) {
      if (!this.userLatLng) {
        this.statusMessage.set('Location not available yet. Allow location or enter a start address.');
        return;
      }
      startObservables.push(
        of({ lat: this.userLatLng.lat, lon: this.userLatLng.lng }),
      );
    } else {
      const origin = this.originText.trim();
      if (!origin) {
        this.statusMessage.set('Enter a start place or turn on “Use my location”.');
        return;
      }
      startObservables.push(this.photon.firstCoordinate(origin));
    }

    const middle = extraStops.map((w) => this.photon.firstCoordinate(w));
    const end = this.photon.firstCoordinate(dest);

    this.statusMessage.set('Geocoding and routing…');

    forkJoin([...startObservables, ...middle, end]).subscribe({
      next: (coords) => {
        if (coords.some((c) => !c)) {
          this.statusMessage.set('Could not find one or more places. Try more specific names.');
          return;
        }
        const points = coords.map((c) => L.latLng(c!.lat, c!.lon));
        this.fetchAndDrawRoute(points);
      },
      error: () => {
        this.statusMessage.set('Search failed. Check your connection and try again.');
      },
    });
  }

  private showPlaceOnMap(lat: number, lon: number, popupLabel: string): void {
    if (!this.map) {
      return;
    }
    const latlng = L.latLng(lat, lon);
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }
    this.searchMarker = L.marker(latlng).addTo(this.map).bindPopup(popupLabel).openPopup();
    this.map.setView(latlng, 14);
  }

  private locateUser(): void {
    if (!this.map || !navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this.map) {
          return;
        }
        const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
        this.userLatLng = latlng;
        if (this.userMarker) {
          this.map.removeLayer(this.userMarker);
        }
        this.userMarker = L.marker(latlng).addTo(this.map).bindPopup('Your location').openPopup();
        this.map.setView(latlng, 13);
      },
      () => {
        this.statusMessage.set(
          'Could not read your location. You can still search the map and type a start address.',
        );
      },
    );
  }

  private clearRouteOverlays(): void {
    if (this.routeOverlays && this.map) {
      this.map.removeLayer(this.routeOverlays);
    }
    this.routeOverlays = undefined;
  }

  private makeRouteStopMarker(ll: L.LatLng, index: number, total: number): L.Marker {
    const isStart = index === 0;
    const isEnd = index === total - 1;
    let label: string;
    let kind: 'start' | 'end' | 'via';
    if (isStart) {
      label = 'A';
      kind = 'start';
    } else if (isEnd) {
      label = 'B';
      kind = 'end';
    } else {
      label = String(index);
      kind = 'via';
    }
    const icon = L.divIcon({
      className: 'mw-route-divicon',
      html: `<div class="mw-route-pin mw-route-pin--${kind}"><span>${label}</span></div>`,
      iconSize: [34, 40],
      iconAnchor: [17, 36],
      popupAnchor: [0, -32],
    });
    const m = L.marker(ll, { icon });
    const popup = isStart ? 'Start' : isEnd ? 'Destination' : `Waypoint ${index}`;
    m.bindPopup(popup);
    return m;
  }

  private fetchAndDrawRoute(points: L.LatLng[]): void {
    if (!this.map || points.length < 2) {
      this.statusMessage.set('Need at least two points to route.');
      return;
    }
    const path = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${environment.osrmRouteBase}${path}?overview=full&geometries=geojson`;
    this.http.get<OsrmResponse>(url).subscribe({
      next: (res) => {
        if (!this.map) {
          return;
        }
        if (res.code !== 'Ok' || !res.routes?.[0]?.geometry) {
          this.statusMessage.set('Routing service could not build a route for these places.');
          return;
        }
        this.clearRouteOverlays();
        const route = res.routes[0];
        const latLngs = route.geometry.coordinates.map(([lng, lat]) => L.latLng(lat, lng));

        const fg = L.featureGroup();
        const halo = L.polyline(latLngs, {
          color: '#0f766e',
          weight: 16,
          opacity: 0.22,
          lineCap: 'round',
          lineJoin: 'round',
        });
        const mid = L.polyline(latLngs, {
          color: '#99f6e4',
          weight: 9,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        });
        const core = L.polyline(latLngs, {
          color: '#0d9488',
          weight: 5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        });
        fg.addLayer(halo);
        fg.addLayer(mid);
        fg.addLayer(core);

        points.forEach((ll, i) => {
          fg.addLayer(this.makeRouteStopMarker(ll, i, points.length));
        });

        fg.addTo(this.map);
        this.routeOverlays = fg;
        this.map.fitBounds(fg.getBounds(), { padding: [64, 64] });

        const km = (route.distance / 1000).toFixed(1);
        const min = Math.round(route.duration / 60);
        this.statusMessage.set(`Route about ${km} km, ~${min} min driving (OSRM demo).`);
      },
      error: () => {
        this.statusMessage.set('Routing request failed. Try again later.');
      },
    });
  }
}
