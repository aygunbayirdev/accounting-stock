import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoicesService } from '../../core/services/invoices.service';
import { InvoiceFormComponent, InvoiceFormValue } from './invoices-form.component';

@Component({
  standalone: true,
  selector: 'app-invoices-edit-page',
  imports: [CommonModule, InvoiceFormComponent, MatSnackBarModule],
  template: `
  <app-invoice-form
    [mode]="mode"
    [value]="formValue"
    (saveInsert)="handleInsert($event)"
    (saveUpdate)="handleUpdate($event)"
  ></app-invoice-form>
  `
})
export class InvoicesEditPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(InvoicesService);
  private snack = inject(MatSnackBar);

  id: number | null = null;
  mode: 'insert' | 'update' | 'view' = 'insert';
  formValue: InvoiceFormValue | null = null;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const isView = this.router.url.endsWith('/view') || !this.router.url.endsWith('/edit') && !!idParam;

    if (!idParam) {
      this.mode = 'insert';
      this.formValue = {
        branchId: null,                                          // NEW (elle gireceksin)
        contactId: null,
        dateUtc: new Date().toISOString(),
        currency: 'TRY',
        type: 'Sales',
        lines: []
      };
      return;
    }

    this.id = Number(idParam);
    this.mode = isView ? 'view' : 'update';

    // Resolver varsa buradan okuyabilirsin. Şimdilik servisle alalım:
    this.svc.getById(this.id).subscribe({
      next: dto => {
        this.formValue = {
          id: dto.id,
          rowVersionBase64: dto.rowVersion,
          branchId: dto.branchId,                                // NEW
          contactId: dto.contactId,
          dateUtc: dto.dateUtc,
          currency: dto.currency,
          type: dto.type as any,
          lines: dto.lines.map(l => ({
            id: l.id,
            itemId: l.itemId ?? null,  // undefined → null dönüşümü
            itemCode: l.itemCode,
            itemName: l.itemName,
            unit: l.unit,
            qty: l.qty,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            net: l.net, vat: l.vat, gross: l.gross
          }))
        };

        // child component’ın update save’inde body'ye id lazım:
        // (basit yöntem) referans üzerinden set edeceğiz → aşağıdaki trick:
        (InvoiceFormComponent as any).prototype.id = this.id;
      },
      error: _ => this.snack.open('Fatura bulunamadı.', 'Kapat', { duration: 3000 })
    });
  }

  handleInsert(body: any) {
    // body branchId'yi already içeriyor (formdan geliyor)
    this.svc.create(body).subscribe({
      next: res => {
        this.snack.open('Fatura oluşturuldu.', 'Kapat', { duration: 2000 });
        this.router.navigate(['/invoices', res.id, 'edit']);
      },
      error: err => this.snack.open('Kaydetme hatası.', 'Kapat', { duration: 3000 })
    });
  }

  handleUpdate(body: any) {
    if (!this.id) return;
    body.id = this.id;
    this.svc.update(this.id, body).subscribe({  // id parametresi eklendi
      next: dto => {
        this.snack.open('Fatura güncellendi.', 'Kapat', { duration: 2000 });
        // yeni rowVersion + snapshot ile formu tazele
        this.formValue = {
          id: dto.id,
          rowVersionBase64: dto.rowVersion,
          branchId: dto.branchId,                                // NEW
          contactId: dto.contactId,
          dateUtc: dto.dateUtc,
          currency: dto.currency,
          type: dto.type as any,
          lines: dto.lines.map(l => ({
            id: l.id, itemId: l.itemId ?? null, itemCode: l.itemCode, itemName: l.itemName, unit: l.unit,  // undefined → null
            qty: l.qty, unitPrice: l.unitPrice, vatRate: l.vatRate,
            net: l.net, vat: l.vat, gross: l.gross
          }))
        };
      },
      error: err => {
        if (err?.error?.code === 'concurrency_conflict')
          this.snack.open('Kayıt başka biri tarafından güncellendi. Yeniden yükleyin.', 'Kapat', { duration: 4000 });
        else
          this.snack.open('Güncelleme hatası.', 'Kapat', { duration: 3000 });
      }
    });
  }
}
