using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Interfaces;
using Accounting.Application.Reports.Queries.Dtos;
using Accounting.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Reports.Queries.GetDashboardStats;

public class GetDashboardStatsHandler(IAppDbContext db, ICurrentUserService currentUserService) : IRequestHandler<GetDashboardStatsQuery, DashboardStatsDto>
{
    public async Task<DashboardStatsDto> Handle(GetDashboardStatsQuery request, CancellationToken ct)
    {
        // IDOR koruması: HQ/Admin olmayan bir kullanıcı, query string'deki branchId'yi
        // değiştirerek başka bir şubenin finansal verilerini göremesin — ApplyBranchFilter'ın
        // diğer tüm liste sorgularında uyguladığı aynı kural (bkz. BranchFilterExtensions).
        var branchId = request.BranchId;
        if (!currentUserService.IsAdmin && !currentUserService.IsHeadquarters && currentUserService.BranchId.HasValue)
        {
            branchId = currentUserService.BranchId.Value;
        }

        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        // 1. Daily Sales (Bugünkü Satış Faturaları Toplamı - Brüt)
        var dailySales = await db.Invoices
            .AsNoTracking()
            .Where(i => i.BranchId == branchId &&
                        i.Type == InvoiceType.Sales &&
                        i.DateUtc >= today && i.DateUtc < tomorrow)
            .SumAsync(i => (decimal?)i.TotalGross, ct) ?? 0m;

        // 2. Daily Collections (Bugünkü Tahsilatlar - Giriş)
        var dailyCollections = await db.Payments
            .AsNoTracking()
            .Where(p => p.BranchId == branchId &&
                        p.Direction == PaymentDirection.In &&
                        p.DateUtc >= today && p.DateUtc < tomorrow)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

        // 3. Total Receivables (Toplam Alacaklar - Satış Faturalarından Kalan)
        var receivables = await db.Invoices
            .AsNoTracking()
            .Where(i => i.BranchId == branchId &&
                        i.Type == InvoiceType.Sales &&
                        i.Balance > 0) // Kalanı olanlar
            .SumAsync(i => (decimal?)i.Balance, ct) ?? 0m;

        // 4. Total Payables (Toplam Borçlar - Alış Faturalarından Kalan)
        var payables = await db.Invoices
            .AsNoTracking()
            .Where(i => i.BranchId == branchId &&
                        i.Type == InvoiceType.Purchase &&
                        i.Balance > 0)
            .SumAsync(i => (decimal?)i.Balance, ct) ?? 0m;

        // 5. Cash/Bank Status
        var accounts = await db.CashBankAccounts
            .AsNoTracking()
            .Where(a => a.BranchId == branchId)
            .Select(a => new CashStatusDto(
                a.Id,
                a.Name,
                a.Type == CashBankAccountType.Cash ? "Kasa" : "Banka",
                a.Balance,
                "TRY" // Şimdilik default TRY
            ))
            .ToListAsync(ct);

        return new DashboardStatsDto(
            dailySales,
            dailyCollections,
            receivables,
            payables,
            accounts
        );
    }
}
