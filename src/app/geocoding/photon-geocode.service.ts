import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  PhotonResponse,
  SearchSuggestion,
  suggestionFromFeature,
} from './location-suggestion.model';

@Injectable({ providedIn: 'root' })
export class PhotonGeocodeService {
  private readonly http = inject(HttpClient);

  suggest(query: string, limit = 8): Observable<SearchSuggestion[]> {
    const q = query.trim();
    if (q.length < 2) {
      return of([]);
    }
    const url =
      `${environment.photonApiBase}?q=${encodeURIComponent(q)}` +
      `&limit=${limit}&lang=en`;
    return this.http.get<PhotonResponse>(url).pipe(
      map((res) =>
        (res.features ?? [])
          .map((f) => suggestionFromFeature(f))
          .filter((s): s is SearchSuggestion => s != null),
      ),
      catchError(() => of([])),
    );
  }

  firstCoordinate(query: string): Observable<{ lat: number; lon: number } | null> {
    const url = `${environment.photonApiBase}?q=${encodeURIComponent(query.trim())}&limit=1&lang=en`;
    return this.http.get<PhotonResponse>(url).pipe(
      map((res) => {
        const f = res.features?.[0];
        if (!f?.geometry?.coordinates) {
          return null;
        }
        const [lon, lat] = f.geometry.coordinates;
        return { lat, lon };
      }),
      catchError(() => of(null)),
    );
  }
}
