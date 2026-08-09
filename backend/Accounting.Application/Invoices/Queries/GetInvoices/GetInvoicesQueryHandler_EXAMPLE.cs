using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Extensions;
using Accounting.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Invoices.Queries.GetInvoices;

/// <summary>
/// Example Query Handler demonstrating DRY branch filtering using ApplyBranchFilter extension.
/// </summary>
public record GetInvoicesQuery : IRequest<List<InvoiceDto>>;

public class GetInvoicesQueryHandler(
    IAppDbContext context,
    ICurrentUserService currentUserService) : IRequestHandler<GetInvoicesQuery, List<InvoiceDto>>
{
    public async Task<List<InvoiceDto>> Handle(GetInvoicesQuery request, CancellationToken cancellationToken)
    {
        // ✅ DRY APPROACH: Single line applies branch filtering
        var invoices = await context.Invoices
            .ApplyBranchFilter(currentUserService) // 👈 Extension method handles all logic
            .Include(i => i.Contact)
            .Include(i => i.Lines)
            .OrderByDescending(i => i.DateUtc)
            .ToListAsync(cancellationToken);

        return invoices.Select(i => new InvoiceDto
        {
            Id = i.Id,
            InvoiceNumber = i.InvoiceNumber,
            ContactName = i.Contact.Name,
            TotalGross = i.TotalGross,
            DateUtc = i.DateUtc
        }).ToList();
    }
}

public record InvoiceDto
{
    public int Id { get; init; }
    public string InvoiceNumber { get; init; } = string.Empty;
    public string ContactName { get; init; } = string.Empty;
    public decimal TotalGross { get; init; }
    public DateTime DateUtc { get; init; }
}

/*
 * COMPARISON:
 * 
 * ❌ Without Extension (Repeated in every handler):
 * var invoices = await context.Invoices
 *     .Where(i => currentUserService.IsAdmin || 
 *                 currentUserService.IsHeadquarters || 
 *                 i.BranchId == currentUserService.BranchId)
 *     .ToListAsync();
 * 
 * ✅ With Extension (DRY, centralized):
 * var invoices = await context.Invoices
 *     .ApplyBranchFilter(currentUserService)
 *     .ToListAsync();
 */
