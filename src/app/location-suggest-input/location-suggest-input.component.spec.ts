import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PhotonGeocodeService } from '../geocoding/photon-geocode.service';
import { LocationSuggestInputComponent } from './location-suggest-input.component';

describe('LocationSuggestInputComponent', () => {
  const sampleSuggestion = {
    title: 'Sydney',
    display: 'Sydney, Australia',
    subtext: 'Australia',
    lat: -33.86,
    lon: 151.2,
  };

  let photonSuggest: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    photonSuggest = vi.fn().mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [LocationSuggestInputComponent],
      providers: [
        {
          provide: PhotonGeocodeService,
          useValue: {
            suggest: photonSuggest,
            firstCoordinate: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LocationSuggestInputComponent);
    fixture.componentRef.setInput('inputId', 'test-search');
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('calls photon after debounce when input has enough characters', async () => {
    photonSuggest.mockReturnValue(of([sampleSuggestion]));
    const fixture = TestBed.createComponent(LocationSuggestInputComponent);
    fixture.componentRef.setInput('inputId', 'test-search');
    fixture.detectChanges();
    const shell = fixture.componentInstance as unknown as {
      onValueInput: (v: string) => void;
      onFocus: () => void;
    };
    shell.onFocus();
    shell.onValueInput('Sy');
    await new Promise((r) => setTimeout(r, 350));
    expect(photonSuggest).toHaveBeenCalledWith('Sy');
    fixture.detectChanges();
    const opts = fixture.nativeElement.querySelectorAll('.loc-suggest__option');
    expect(opts.length).toBe(1);
  });

  it('pick sets value and emits picked', () => {
    const fixture = TestBed.createComponent(LocationSuggestInputComponent);
    fixture.componentRef.setInput('inputId', 'test-search');
    fixture.detectChanges();
    const picked = vi.fn();
    fixture.componentInstance.picked.subscribe(picked);
    const c = fixture.componentInstance as unknown as {
      suggestions: { set: (v: typeof sampleSuggestion[]) => void };
      focused: { set: (v: boolean) => void };
      pick: (s: typeof sampleSuggestion, ev: Event) => void;
    };
    c.suggestions.set([sampleSuggestion]);
    c.focused.set(true);
    fixture.detectChanges();
    c.pick(sampleSuggestion, new Event('mousedown'));
    expect(fixture.componentInstance.value()).toBe(sampleSuggestion.display);
    expect(picked).toHaveBeenCalledWith({
      lat: sampleSuggestion.lat,
      lon: sampleSuggestion.lon,
      display: sampleSuggestion.display,
    });
  });

  it('clears suggestions when input is below minimum length', () => {
    const fixture = TestBed.createComponent(LocationSuggestInputComponent);
    fixture.componentRef.setInput('inputId', 'test-search');
    fixture.detectChanges();
    const c = fixture.componentInstance as unknown as {
      suggestions: import('@angular/core').WritableSignal<typeof sampleSuggestion[]>;
      onValueInput: (v: string) => void;
    };
    c.suggestions.set([sampleSuggestion]);
    c.onValueInput('a');
    expect(c.suggestions()).toEqual([]);
  });
});
