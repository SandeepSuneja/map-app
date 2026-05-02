import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { PhotonGeocodeService } from '../geocoding/photon-geocode.service';
import { SearchSuggestion } from '../geocoding/location-suggestion.model';

const MIN_CHARS = 2;

@Component({
  selector: 'app-location-suggest-input',
  imports: [FormsModule],
  templateUrl: './location-suggest-input.component.html',
  styleUrl: './location-suggest-input.component.scss',
  host: { class: 'd-block w-100' },
})
export class LocationSuggestInputComponent {
  private readonly photon = inject(PhotonGeocodeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly query$ = new Subject<string>();

  readonly comboRoot = viewChild<ElementRef<HTMLElement>>('comboRoot');
  readonly value = model<string>('');

  readonly inputId = input.required<string>();
  readonly placeholder = input('Search…');
  readonly disabled = input(false);
  readonly iconClass = input('bi bi-geo-alt');
  readonly showFindButton = input(false);
  readonly findLabel = input('Find');
  readonly ariaListLabel = input('Location suggestions');

  readonly picked = output<{ lat: number; lon: number; display: string }>();
  readonly findRequested = output<void>();

  private readonly focused = signal(false);
  protected readonly suggestions = signal<SearchSuggestion[]>([]);

  protected readonly dropdownOpen = computed(
    () => this.focused() && this.suggestions().length > 0,
  );

  protected readonly listboxId = computed(() => `${this.inputId()}-listbox`);

  constructor() {
    this.query$
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < MIN_CHARS) {
            return of([]);
          }
          return this.photon.suggest(q);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.suggestions.set(items);
      });
  }

  @HostListener('document:pointerdown', ['$event'])
  protected onDocumentPointerDown(ev: PointerEvent): void {
    const root = this.comboRoot()?.nativeElement;
    if (!root) {
      return;
    }
    const t = ev.target as Node | null;
    if (t && !root.contains(t)) {
      this.focused.set(false);
    }
  }

  protected onValueInput(v: string): void {
    this.value.set(v);
    this.query$.next(v);
    if (v.trim().length < MIN_CHARS) {
      this.suggestions.set([]);
    }
  }

  protected onFocus(): void {
    this.focused.set(true);
    this.query$.next(this.value());
  }

  protected onBlur(): void {
    setTimeout(() => this.focused.set(false), 200);
  }

  protected onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.focused.set(false);
      this.suggestions.set([]);
    }
  }

  protected onEnter(): void {
    this.findRequested.emit();
  }

  protected onFindClick(): void {
    this.findRequested.emit();
  }

  protected pick(s: SearchSuggestion, ev: Event): void {
    ev.preventDefault();
    this.value.set(s.display);
    this.suggestions.set([]);
    this.focused.set(false);
    this.picked.emit({ lat: s.lat, lon: s.lon, display: s.display });
  }
}
