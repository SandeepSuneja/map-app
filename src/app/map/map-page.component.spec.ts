import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { PhotonGeocodeService } from '../geocoding/photon-geocode.service';

vi.mock('leaflet', () => {
  const noop = (): void => {};
  interface MockMap {
    setView: () => MockMap;
    remove: () => void;
    invalidateSize: () => void;
    addLayer: () => void;
    removeLayer: () => void;
    fitBounds: () => void;
  }
  const mockMap: MockMap = {
    setView() {
      return mockMap;
    },
    remove: noop,
    invalidateSize: noop,
    addLayer: noop,
    removeLayer: noop,
    fitBounds: noop,
  };
  interface MarkerChain {
    addTo: () => MarkerChain;
    bindPopup: () => MarkerChain;
    openPopup: () => void;
  }
  const markerChain: MarkerChain = {
    addTo() {
      return markerChain;
    },
    bindPopup() {
      return markerChain;
    },
    openPopup: noop,
  };
  const L = {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: noop,
      },
    },
    map: () => mockMap,
    tileLayer: () => ({ addTo: noop }),
    marker: (): MarkerChain => markerChain,
    latLng: (lat: number, lng: number) => ({ lat, lng }),
    divIcon: () => ({}),
    featureGroup: () => ({
      addLayer: noop,
      addTo: noop,
      getBounds: () => ({}),
    }),
    polyline: () => ({}),
  };
  return { ...L, default: L };
});

describe('MapPageComponent', () => {
  let MapPageComponent: typeof import('./map-page').MapPageComponent;
  let photonFirstCoordinate: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    ({ MapPageComponent } = await import('./map-page'));
  });

  beforeEach(async () => {
    photonFirstCoordinate = vi.fn();
    await TestBed.configureTestingModule({
      imports: [MapPageComponent],
      providers: [
        provideHttpClient(),
        {
          provide: PhotonGeocodeService,
          useValue: {
            suggest: vi.fn().mockReturnValue(of([])),
            firstCoordinate: photonFirstCoordinate,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MapPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows status when findOnMap with empty search', () => {
    const fixture = TestBed.createComponent(MapPageComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as unknown as {
      searchText: string;
      findOnMap: () => void;
    };
    c.searchText = '   ';
    c.findOnMap();
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Enter a place to search.');
  });

  it('addWaypoint appends empty field up to max', () => {
    const fixture = TestBed.createComponent(MapPageComponent);
    const c = fixture.componentInstance as unknown as {
      waypoints: string[];
      maxWaypoints: number;
      addWaypoint: () => void;
    };
    c.waypoints = [];
    for (let i = 0; i < 15; i++) {
      c.addWaypoint();
    }
    expect(c.waypoints.length).toBe(c.maxWaypoints);
  });

  it('removeWaypoint drops selected index', () => {
    const fixture = TestBed.createComponent(MapPageComponent);
    const c = fixture.componentInstance as unknown as {
      waypoints: string[];
      removeWaypoint: (i: number) => void;
    };
    c.waypoints = ['a', 'b', 'c'];
    c.removeWaypoint(1);
    expect(c.waypoints).toEqual(['a', 'c']);
  });

  it('updateWaypoint replaces value at index', () => {
    const fixture = TestBed.createComponent(MapPageComponent);
    const c = fixture.componentInstance as unknown as {
      waypoints: string[];
      updateWaypoint: (i: number, v: string) => void;
    };
    c.waypoints = ['a', 'b'];
    c.updateWaypoint(0, 'z');
    expect(c.waypoints).toEqual(['z', 'b']);
  });

  it('findOnMap geocodes trimmed query', () => {
    photonFirstCoordinate.mockReturnValue(of({ lat: -34.4, lon: 150.6 }));
    const fixture = TestBed.createComponent(MapPageComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as unknown as {
      searchText: string;
      findOnMap: () => void;
    };
    c.searchText = '  Wollongong  ';
    c.findOnMap();
    expect(photonFirstCoordinate).toHaveBeenCalledWith('Wollongong');
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent).toContain('Showing search result on the map.');
  });
});
