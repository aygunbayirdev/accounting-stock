import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Observable, map } from 'rxjs';
import { EntityPickerComponent, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import { CashBankAccountsService } from '../../core/services/cash-bank-accounts.service';
import { ContactsService } from '../../core/services/contacts.service';
import {
  PaymentDetailDto,
  PaymentDirection,
  PAYMENT_CURRENCIES
} from '../../core/models/payment.models';

export interface PaymentFormDialogData {
  payment: PaymentDetailDto | null;  // null => oluştur
  accountLabel?: string | null;      // düzenlemede entity-picker'ın başlangıç etiketi (liste satırından: "KOD - Ad")
  contactLabel?: string | null;
}

@Component({
  standalone: true,
  selector: 'app-payment-form-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, EntityPickerComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ data.payment ? 'Ödemeyi Düzenle' : 'Yeni Ödeme' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <app-entity-picker
          label="Hesap (Kasa/Banka)"
          [fetcher]="accountFetcher"
          [value]="form.value.accountId ?? null"
          [initialLabel]="data.accountLabel ?? null"
          [width]="'100%'"
          (valueChange)="onAccountSelected($event)">
        </app-entity-picker>

        <app-entity-picker
          label="Cari (opsiyonel)"
          [fetcher]="contactFetcher"
          [value]="form.value.contactId ?? null"
          [initialLabel]="data.contactLabel ?? null"
          [width]="'100%'"
          (valueChange)="onContactSelected($event)">
        </app-entity-picker>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Tür</mat-label>
            <mat-select formControlName="direction">
              <mat-option [value]="PaymentDirection.In">Tahsilat (Gelen)</mat-option>
              <mat-option [value]="PaymentDirection.Out">Ödeme (Giden)</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tarih</mat-label>
            <input matInput type="datetime-local" formControlName="dateUtc" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Tutar</mat-label>
            <input matInput formControlName="amount" placeholder="0.00" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Para Birimi</mat-label>
            <mat-select formControlName="currency">
              <mat-option *ngFor="let c of currencies" [value]="c">{{ c }}</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Açıklama</mat-label>
          <input matInput formControlName="description" maxlength="256" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close(null)">Vazgeç</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">Kaydet</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .fields { display:flex; flex-direction:column; gap:8px; min-width:420px; padding-top:8px; }
    .row { display:flex; gap:10px; }
    .row mat-form-field { flex:1; }
  `]
})
export class PaymentFormDialogComponent {
  dialogRef = inject(MatDialogRef<PaymentFormDialogComponent>);
  data = inject<PaymentFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private cashBankAccountsService = inject(CashBankAccountsService);
  private contactsService = inject(ContactsService);

  PaymentDirection = PaymentDirection;
  currencies = PAYMENT_CURRENCIES;

  form = this.fb.group({
    accountId: [this.data.payment?.accountId ?? null, Validators.required],
    contactId: [this.data.payment?.contactId ?? null],
    direction: [this.data.payment?.direction === 'Out' ? PaymentDirection.Out : PaymentDirection.In, Validators.required],
    dateUtc: [this.toLocalInputValue(this.data.payment?.dateUtc), Validators.required],
    amount: [this.data.payment?.amount ?? '', [Validators.required]],
    currency: [this.data.payment?.currency ?? 'TRY', Validators.required],
    description: ['']
  });

  accountFetcher = (search: string): Observable<PickerOption[]> =>
    this.cashBankAccountsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(a => ({ id: a.id, label: a.code, sublabel: `${a.name} (${a.currency})` })))
    );

  contactFetcher = (search: string): Observable<PickerOption[]> =>
    this.contactsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(c => ({ id: c.id, label: c.code, sublabel: c.name })))
    );

  onAccountSelected(id: number | null) {
    this.form.patchValue({ accountId: id });
  }

  onContactSelected(id: number | null) {
    this.form.patchValue({ contactId: id });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      accountId: Number(v.accountId),
      contactId: v.contactId ?? null,
      linkedInvoiceId: this.data.payment?.linkedInvoiceId ?? null,
      dateUtc: this.localToUtcIso(v.dateUtc!),
      direction: Number(v.direction),
      amount: String(v.amount).replace(',', '.').trim(),
      currency: v.currency!,
      description: v.description || null
    });
  }

  private toLocalInputValue(isoUtc?: string | null): string {
    const d = isoUtc ? new Date(isoUtc) : new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  private localToUtcIso(localStr: string): string {
    return new Date(localStr).toISOString();
  }
}
