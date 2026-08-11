import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { ReportsService } from '../../core/services/reports.service';
import { BranchesService } from '../../core/services/branches.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardStatsDto } from '../../core/models/report.models';
import { BranchListItemDto } from '../../core/models/branch.models';

@Component({
  standalone: true,
  selector: 'app-dashboard-page',
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule, MatButtonModule
  ],
  template: `
    <div class="toolbar">
      <span class="title">Dashboard</span>
      <span class="spacer"></span>
      @if (showBranchSelector) {
        <mat-form-field appearance="outline" class="branch-field">
          <mat-label>Şube</mat-label>
          <mat-select [(ngModel)]="branchId" (selectionChange)="load()">
            @for (b of branches; track b.id) {
              <mat-option [value]="b.id">{{ b.code }} - {{ b.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
    </div>

    @if (loading) {
      <div class="loading">
        <mat-spinner diameter="36"></mat-spinner>
      </div>
    } @else if (error) {
      <div class="error-state">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
        <button mat-button (click)="load()">Tekrar Dene</button>
      </div>
    } @else if (stats) {
      <div class="summary-grid">
        <mat-card class="summary-card">
          <mat-icon class="summary-icon sales">point_of_sale</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Günlük Satış</span>
            <span class="summary-value">{{ formatAmount(stats.dailySalesTotal) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon collections">payments</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Günlük Tahsilat</span>
            <span class="summary-value">{{ formatAmount(stats.dailyCollectionsTotal) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon receivables">trending_up</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Toplam Alacak</span>
            <span class="summary-value">{{ formatAmount(stats.totalReceivables) }}</span>
          </div>
        </mat-card>
        <mat-card class="summary-card">
          <mat-icon class="summary-icon payables">trending_down</mat-icon>
          <div class="summary-body">
            <span class="summary-label">Toplam Borç</span>
            <span class="summary-value">{{ formatAmount(stats.totalPayables) }}</span>
          </div>
        </mat-card>
      </div>

      <mat-card class="cash-card">
        <mat-card-header>
          <mat-card-title>Kasa/Banka Durumu</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (stats.cashStatus.length === 0) {
            <p class="empty">Bu şubeye ait kasa/banka hesabı bulunmuyor.</p>
          } @else {
            <table class="cash-table">
              <thead>
                <tr>
                  <th>Hesap</th>
                  <th>Tür</th>
                  <th class="amount-col">Bakiye</th>
                  <th>PB</th>
                </tr>
              </thead>
              <tbody>
                @for (a of stats.cashStatus; track a.id) {
                  <tr>
                    <td>{{ a.name }}</td>
                    <td>{{ a.type }}</td>
                    <td class="amount-col" [class.negative]="isNegative(a.balance)">{{ formatAmount(a.balance) }}</td>
                    <td>{{ a.currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    .toolbar { display:flex; align-items:center; padding:8px 0 16px; }
    .title { font-weight:600; font-size:20px; }
    .spacer { flex:1; }
    .branch-field { min-width: 240px; margin-bottom: -1.25em; }

    .loading { display:flex; justify-content:center; padding: 48px 0; }
    .error-state {
      display:flex; align-items:center; gap:10px;
      padding: 16px; border-radius: 8px; max-width: 600px;
      background: rgba(198,40,40,0.08); color: #c62828;
    }
    .error-state span { flex:1; }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    .summary-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
    }
    .summary-icon {
      width: 44px; height: 44px; font-size: 44px;
      opacity: 0.85;
    }
    .summary-icon.sales { color: #2e7d32; }
    .summary-icon.collections { color: #1565c0; }
    .summary-icon.receivables { color: #ef6c00; }
    .summary-icon.payables { color: #c62828; }
    .summary-body { display: flex; flex-direction: column; gap: 4px; }
    .summary-label { font-size: 13px; color: rgba(0,0,0,0.6); }
    .summary-value { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }

    .cash-card { max-width: 720px; }
    .cash-table { width: 100%; border-collapse: collapse; }
    .cash-table th { text-align: left; font-size: 12px; color: rgba(0,0,0,0.6); font-weight: 500; padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.12); }
    .cash-table td { padding: 8px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
    .amount-col { text-align: right; font-variant-numeric: tabular-nums; }
    .amount-col.negative { color: #c62828; }
    .empty { color: rgba(0,0,0,0.6); }
  `]
})
export class DashboardPageComponent implements OnInit {
  branches: BranchListItemDto[] = [];
  branchId: number | null = null;
  stats: DashboardStatsDto | null = null;
  loading = false;
  error: string | null = null;
  showBranchSelector = false;

  constructor(
    private reportsService: ReportsService,
    private branchesService: BranchesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.showBranchSelector = !!user && (user.role === 'Admin' || user.isHeadquarters);

    this.branchesService.list().subscribe(branches => {
      this.branches = branches;
      this.branchId = user?.branchId ?? branches[0]?.id ?? null;
      this.load();
    });
  }

  load(): void {
    if (this.branchId == null) return;
    this.loading = true;
    this.error = null;
    this.reportsService.getDashboard(this.branchId).subscribe({
      next: stats => {
        this.stats = stats;
        this.loading = false;
      },
      error: () => {
        this.stats = null;
        this.loading = false;
        this.error = 'Dashboard verileri yüklenirken bir hata oluştu.';
      }
    });
  }

  formatAmount(value: string): string {
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  isNegative(value: string): boolean {
    return Number(value) < 0;
  }
}
