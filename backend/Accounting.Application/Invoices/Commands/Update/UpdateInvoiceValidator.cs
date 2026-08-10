using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Validation;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Accounting.Application.Common.Interfaces;

namespace Accounting.Application.Invoices.Commands.Update;

public sealed class UpdateInvoiceValidator : AbstractValidator<UpdateInvoiceCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUserService;

    public UpdateInvoiceValidator(IAppDbContext db, ICurrentUserService currentUserService)
    {
        _db = db;
        _currentUserService = currentUserService;

        RuleFor(x => x.Id).GreaterThan(0);

        RuleFor(x => x.RowVersionBase64).MustBeValidRowVersion();

        RuleFor(x => x.DateUtc)
            .Must(d => d.Kind == DateTimeKind.Utc || d.Kind == DateTimeKind.Unspecified)
            .WithMessage("DateUtc geçerli bir tarih olmalıdır.");

        RuleFor(x => x.Currency).MustBeValidCurrency();

        RuleFor(x => x.ContactId).GreaterThan(0);

        RuleFor(x => x.Lines)
            .NotNull().WithMessage("Lines null olamaz.")
            .Must(l => l != null && l.Count > 0).WithMessage("En az bir satır olmalıdır.");

        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Geçersiz fatura türü.");

        // Branch Tutarlılık Kontrolü: Contact aynı şubeye ait olmalı
        RuleFor(x => x)
            .MustAsync(ContactBelongsToSameBranchAsync)
            .WithMessage("Cari (Contact) fatura ile aynı şubeye ait olmalıdır.");

        // Item'lar gerçekten var mı (Item artık global/branch-agnostic bir entity,
        // bu yüzden burada bir şube kıyaslaması değil, sadece varlık kontrolü yapılır).
        RuleFor(x => x)
            .MustAsync(AllItemsExistAsync)
            .WithMessage("Fatura satırlarındaki bir veya daha fazla ürün bulunamadı.");

        // Id>0 olan satırlarda tekrar kontrolü
        RuleFor(x => x.Lines)
            .Must(lines =>
            {
                var ids = lines.Where(l => l.Id > 0).Select(l => l.Id);
                return ids.Distinct().Count() == ids.Count();
            })
            .WithMessage("Lines içinde tekrar eden satır Id değerleri var.");

        RuleForEach(x => x.Lines).SetValidator(new UpdateInvoiceLineValidator());
    }

    private async Task<bool> ContactBelongsToSameBranchAsync(UpdateInvoiceCommand cmd, CancellationToken ct)
    {
        if (!_currentUserService.BranchId.HasValue) return false;
        var currentBranchId = _currentUserService.BranchId.Value;

        var contact = await _db.Contacts
            .AsNoTracking()
            .Where(c => c.Id == cmd.ContactId && !c.IsDeleted)
            .Select(c => new { c.BranchId })
            .FirstOrDefaultAsync(ct);

        if (contact == null)
            return false;

        return contact.BranchId == currentBranchId;
    }

    private async Task<bool> AllItemsExistAsync(UpdateInvoiceCommand cmd, CancellationToken ct)
    {
        var itemIds = cmd.Lines
            .Where(l => l.ItemId.HasValue)
            .Select(l => l.ItemId!.Value)
            .Distinct()
            .ToList();

        if (itemIds.Count == 0)
            return true;

        var existingCount = await _db.Items
            .AsNoTracking()
            .Where(i => itemIds.Contains(i.Id) && !i.IsDeleted)
            .CountAsync(ct);

        return existingCount == itemIds.Count;
    }
}

internal sealed class UpdateInvoiceLineValidator : AbstractValidator<UpdateInvoiceLineDto>
{
    public UpdateInvoiceLineValidator()
    {
        RuleFor(l => l.Id).GreaterThanOrEqualTo(0);
        RuleFor(l => l.ItemId).GreaterThan(0).When(l => l.ItemId.HasValue);

        RuleFor(l => l.Qty)
            .GreaterThan(0)
            .WithMessage("Miktar 0'dan büyük olmalıdır.");

        RuleFor(l => l.UnitPrice)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Birim fiyat 0'dan küçük olamaz.");

        RuleFor(l => l.VatRate).InclusiveBetween(0, 100);

        RuleFor(l => l.DiscountRate)
            .InclusiveBetween(0, 100)
            .When(l => l.DiscountRate.HasValue)
            .WithMessage("İskonto oranı 0-100 arasında olmalıdır.");
    }
}
