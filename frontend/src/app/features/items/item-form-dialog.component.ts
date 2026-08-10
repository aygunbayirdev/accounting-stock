import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ItemDetailDto, ItemType, ItemTypeNames } from '../../core/models/item.models';

export interface ItemFormDialogData {
  item: ItemDetailDto | null; // null => oluştur
}

@Component({
  standalone: true,
  selector: 'app-item-form-dialog',
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Kartı Düzenle' : 'Yeni Kart' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Tür</mat-label>
          <mat-select formControlName="type">
            <mat-option [value]="ItemType.Inventory">{{ ItemTypeNames[ItemType.Inventory] }}</mat-option>
            <mat-option [value]="ItemType.Service">{{ ItemTypeNames[ItemType.Service] }}</mat-option>
            <mat-option [value]="ItemType.Expense">{{ ItemTypeNames[ItemType.Expense] }}</mat-option>
            <mat-option [value]="ItemType.FixedAsset">{{ ItemTypeNames[ItemType.FixedAsset] }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Kod</mat-label>
            <input matInput formControlName="code" maxlength="64" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ad</mat-label>
            <input matInput formControlName="name" maxlength="256" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Birim</mat-label>
            <input matInput formControlName="unit" maxlength="16" placeholder="Adet, Kg, Saat..." />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>KDV (%)</mat-label>
            <input matInput type="number" min="0" max="100" formControlName="vatRate" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Alış Fiyatı</mat-label>
            <input matInput formControlName="purchasePrice" placeholder="0.00" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Satış Fiyatı</mat-label>
            <input matInput formControlName="salesPrice" placeholder="0.00" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Varsayılan Tevkifat (%)</mat-label>
            <input matInput type="number" min="0" max="100" formControlName="defaultWithholdingRate" />
          </mat-form-field>
          <mat-form-field appearance="outline" *ngIf="form.value.type === ItemType.FixedAsset">
            <mat-label>Faydalı Ömür (Yıl)</mat-label>
            <input matInput type="number" min="1" max="50" formControlName="usefulLifeYears" />
          </mat-form-field>
        </div>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Alış Hesap Kodu</mat-label>
            <input matInput formControlName="purchaseAccountCode" maxlength="16" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Satış Hesap Kodu</mat-label>
            <input matInput formControlName="salesAccountCode" maxlength="16" />
          </mat-form-field>
        </div>
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
export class ItemFormDialogComponent {
  dialogRef = inject(MatDialogRef<ItemFormDialogComponent>);
  data = inject<ItemFormDialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  ItemType = ItemType;
  ItemTypeNames = ItemTypeNames;

  form = this.fb.group({
    type: [this.data.item?.type ?? ItemType.Inventory, Validators.required],
    code: [this.data.item?.code ?? '', [Validators.required, Validators.maxLength(64)]],
    name: [this.data.item?.name ?? '', [Validators.required, Validators.maxLength(256)]],
    unit: [this.data.item?.unit ?? '', [Validators.required, Validators.maxLength(16)]],
    vatRate: [this.data.item?.vatRate ?? 0, [Validators.required, Validators.min(0), Validators.max(100)]],
    purchasePrice: [this.data.item?.purchasePrice ?? ''],
    salesPrice: [this.data.item?.salesPrice ?? ''],
    defaultWithholdingRate: [this.data.item?.defaultWithholdingRate ?? null],
    usefulLifeYears: [this.data.item?.usefulLifeYears ?? null],
    purchaseAccountCode: [this.data.item?.purchaseAccountCode ?? '', [Validators.maxLength(16)]],
    salesAccountCode: [this.data.item?.salesAccountCode ?? '', [Validators.maxLength(16)]]
  });

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.dialogRef.close({
      categoryId: this.data.item?.categoryId ?? null,
      type: Number(v.type),
      code: v.code!,
      name: v.name!,
      unit: v.unit!,
      vatRate: Number(v.vatRate ?? 0),
      defaultWithholdingRate: v.defaultWithholdingRate != null && v.defaultWithholdingRate !== ('' as any) ? Number(v.defaultWithholdingRate) : null,
      purchasePrice: v.purchasePrice ? String(v.purchasePrice).replace(',', '.').trim() || null : null,
      salesPrice: v.salesPrice ? String(v.salesPrice).replace(',', '.').trim() || null : null,
      purchaseAccountCode: v.purchaseAccountCode || null,
      salesAccountCode: v.salesAccountCode || null,
      usefulLifeYears: v.usefulLifeYears != null && v.usefulLifeYears !== ('' as any) ? Number(v.usefulLifeYears) : null
    });
  }
}
