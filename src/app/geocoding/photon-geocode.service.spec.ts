import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { PhotonGeocodeService } from './photon-geocode.service';

describe('PhotonGeocodeService', () => {
  let httpMock: HttpTestingController;
  let service: PhotonGeocodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PhotonGeocodeService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PhotonGeocodeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('suggest emits empty array for queries shorter than 2 chars', () =>
    new Promise<void>((done) => {
      service.suggest('a').subscribe((r) => {
        expect(r).toEqual([]);
        done();
      });
    }));

  it('suggest requests photon and maps features', () => {
    let result: unknown;
    service.suggest('Berlin').subscribe((r) => {
      result = r;
    });
    const req = httpMock.expectOne(
      (r) => r.url.startsWith(environment.photonApiBase) && r.url.includes('q=Berlin'),
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      features: [
        {
          geometry: { type: 'Point', coordinates: [13.4, 52.5] },
          properties: { name: 'Berlin', country: 'Germany' },
        },
      ],
    });
    expect(Array.isArray(result)).toBe(true);
    expect((result as { title: string }[])[0].title).toBe('Berlin');
  });

  it('firstCoordinate returns coords from first feature', () => {
    let result: unknown;
    service.firstCoordinate('Paris').subscribe((c) => {
      result = c;
    });
    const req = httpMock.expectOne((r) => r.url.includes('q=Paris'));
    req.flush({
      features: [
        {
          geometry: { type: 'Point', coordinates: [2.35, 48.86] },
          properties: { name: 'Paris' },
        },
      ],
    });
    expect(result).toEqual({ lat: 48.86, lon: 2.35 });
  });

  it('firstCoordinate returns null when no features', () => {
    let result: unknown;
    service.firstCoordinate('Nowhere').subscribe((c) => {
      result = c;
    });
    httpMock.expectOne(() => true).flush({ features: [] });
    expect(result).toBeNull();
  });

  it('suggest returns empty on HTTP error', () => {
    let result: unknown;
    service.suggest('fail').subscribe((r) => {
      result = r;
    });
    httpMock.expectOne(() => true).flush('', { status: 500, statusText: 'Server Error' });
    expect(result).toEqual([]);
  });
});
