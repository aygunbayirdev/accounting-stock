import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

export interface PickerOption {
  id: number;
  label: string;
  sublabel?: string | null;
}

/**
 * Genel amaçlı arama/autocomplete bileşeni. `fetcher` parametrik olduğu için
 * Contact/Branch/Item gibi farklı varlık servisleriyle beslenebilir.
 */
@Component({
  standalone: true,
  selector: 'app-entity-picker',
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule],
  template: `
    <mat-form-field appearance="outline" [style.width]="width">
      <mat-label>{{ label }}</mat-label>
      <input
        matInput
        [formControl]="control"
        [matAutocomplete]="auto"
        (focus)="ensureLoaded()"
        [placeholder]="placeholder ?? ''"
      />
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayWith" (optionSelected)="onSelected($event)">
        @for (opt of options; track opt.id) {
          <mat-option [value]="opt">
            {{ opt.label }}
            @if (opt.sublabel) { <span class="sublabel"> — {{ opt.sublabel }}</span> }
          </mat-option>
        }
        @if (options.length === 0) {
          <mat-option disabled>Sonuç yok</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: [`
    .sublabel { color: var(--mat-sys-on-surface-variant, #666); font-size: 0.9em; }
  `]
})
export class EntityPickerComponent implements OnInit, OnChanges {
  @Input({ required: true }) label = '';
  @Input({ required: true }) fetcher!: (search: string) => Observable<PickerOption[]>;
  @Input() value: number | null = null;
  @Input() initialLabel: string | null = null;
  @Input() width = '100%';
  @Input() placeholder: string | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  control = new FormControl<string | PickerOption>('');
  options: PickerOption[] = [];
  private loaded = false;

  ngOnInit() {
    if (this.value != null && this.initialLabel) {
      this.control.setValue({ id: this.value, label: this.initialLabel }, { emitEvent: false });
    }

    this.control.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged((a, b) => this.toSearchTerm(a) === this.toSearchTerm(b)),
        switchMap(v => {
          if (v != null && typeof v !== 'string') return of([]); // seçim yapıldı, arama tetikleme
          return this.fetcher(this.toSearchTerm(v));
        })
      )
      .subscribe(opts => {
        this.options = opts;
        this.loaded = true;
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['value'] || changes['initialLabel']) && this.value != null && this.initialLabel) {
      const current = this.control.value;
      const currentId = current != null && typeof current !== 'string' ? current.id : null;
      if (currentId !== this.value) {
        this.control.setValue({ id: this.value, label: this.initialLabel }, { emitEvent: false });
      }
    }
    if ((changes['value']) && this.value == null) {
      this.control.setValue('', { emitEvent: false });
    }
  }

  ensureLoaded() {
    if (!this.loaded) {
      this.fetcher('').subscribe(opts => {
        this.options = opts;
        this.loaded = true;
      });
    }
  }

  displayWith = (opt: PickerOption | string | null): string => {
    if (opt == null) return '';
    return typeof opt === 'string' ? opt : opt.label;
  };

  onSelected(e: MatAutocompleteSelectedEvent) {
    const opt = e.option.value as PickerOption;
    this.valueChange.emit(opt.id);
  }

  private toSearchTerm(v: string | PickerOption | null): string {
    if (v == null) return '';
    return typeof v === 'string' ? v : v.label;
  }
}
