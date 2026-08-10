import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Observable, map } from 'rxjs';
import { EntityPickerComponent, PickerOption } from '../../shared/entity-picker/entity-picker.component';
import { CashBankAccountsService } from '../../core/services/cash-bank-accounts.service';
import { ChequeDetailDto } from '../../core/models/cheque.models';

export interface ChequeCashDialogData {
  cheque: ChequeDetailDto;
}

@Component({
  standalone: true,
  selector: 'app-cheque-cash-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, EntityPickerComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ data.cheque.direction === 'Inbound' ? 'Tahsil Et' : 'Öde' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <p class="hint">
          "{{ data.cheque.chequeNumber }}" ({{ data.cheque.amount }} {{ data.cheque.currency }})
          {{ data.cheque.direction === 'Inbound' ? 'kasaya/bankaya tahsil edilecek.' : 'kasadan/bankadan ödenecek.' }}
        </p>

        <app-entity-picker
          label="Kasa/Banka Hesabı"
          [fetcher]="accountFetcher"
          [value]="form.value.cashBankAccountId ?? null"
          [width]="'100%'"
          (valueChange)="onAccountSelected($event)">
        </app-entity-picker>

        <mat-form-field appearance="outline">
          <mat-label>İşlem Tarihi</mat-label>
          <input matInput type="datetime-local" formControlName="transactionDate" />
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="dialogRef.close(null)">Vazgeç</button>
        <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">Onayla</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .fields { display:flex; flex-direction:column; gap:10px; min-width:380px; padding-top:8px; }
    .hint { font-size:0.9em; color: var(--mat-sys-on-surface-variant, #666); margin:0; }
  `]
})
export class ChequeCashDialogComponent {
  dialogRef = inject(MatDialogRef<ChequeCashDialogComponent>);
  data = inject<ChequeCashDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private cashBankAccountsService = inject(CashBankAccountsService);

  form = this.fb.group({
    cashBankAccountId: [null as number | null, Validators.required],
    transactionDate: [this.toLocalInputValue(), Validators.required]
  });

  accountFetcher = (search: string): Observable<PickerOption[]> =>
    this.cashBankAccountsService.list({ search: search || null, pageSize: 20 }).pipe(
      map(res => res.items.map(a => ({ id: a.id, label: a.code, sublabel: `${a.name} (${a.currency})` })))
    );

  onAccountSelected(id: number | null) {
    this.form.patchValue({ cashBankAccountId: id });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      cashBankAccountId: Number(v.cashBankAccountId),
      transactionDate: new Date(v.transactionDate!).toISOString()
    });
  }

  private toLocalInputValue(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }
}
