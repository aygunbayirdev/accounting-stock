using Accounting.Application.Common.Interfaces;
using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Validation;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Invoices.Commands.Create;

public class CreateInvoiceValidator : AbstractValidator<CreateInvoiceCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUserService;

    public CreateInvoiceValidator(IAppDbContext db, ICurrentUserService currentUserService)
    {
        _db = db;
        _currentUserService = currentUserService;

        RuleFor(x => x.ContactId)
            .GreaterThan(0);

        RuleFor(x => x.DateUtc)
            .NotEmpty()
            .WithMessage("DateUtc gereklidir.");

        RuleFor(x => x.Currency).MustBeValidCurrency();

        RuleFor(x => x.Type)
            .IsInEnum()
            .WithMessage("Geçersiz fatura türü.");

        // 🆕 DocumentType validasyonu
        RuleFor(x => x.DocumentType)
            .IsInEnum()
            .When(x => x.DocumentType.HasValue)
            .WithMessage("Geçerli bir belge türü seçiniz.");

        // Branch kontrolü
        RuleFor(x => x)
            .MustAsync(ContactBelongsToSameBranchAsync)
            .WithMessage("Cari (Contact) fatura ile aynı şubeye ait olmalıdır.")
            .When(x => x.ContactId > 0 && _currentUserService.BranchId.HasValue);

        // Satırlar
        RuleFor(x => x.Lines)
            .NotNull()
            .Must(l => l.Count > 0)
            .WithMessage("En az bir satır girmelisiniz.");

        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            // 🆕 ItemId artık zorunlu (ExpenseDefinitionId yok)
            line.RuleFor(l => l.ItemId)
                .NotNull()
                .GreaterThan(0)
                .WithMessage("ItemId gereklidir.");

            line.RuleFor(l => l.Qty)
                .GreaterThan(0)
                .WithMessage("Miktar 0'dan büyük olmalıdır.");

            line.RuleFor(l => l.UnitPrice)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Birim fiyat 0'dan küçük olamaz.");

            line.RuleFor(l => l.VatRate)
                .InclusiveBetween(0, 100);

            line.RuleFor(l => l.DiscountRate)
                .InclusiveBetween(0, 100)
                .When(l => l.DiscountRate.HasValue)
                .WithMessage("İskonto oranı 0-100 arasında olmalıdır.");
        });

        // Item'lar gerçekten var mı (Item artık global/branch-agnostic bir entity,
        // bu yüzden burada bir şube kıyaslaması değil, sadece varlık kontrolü yapılır).
        RuleFor(x => x)
            .MustAsync(AllItemsExistAsync)
            .WithMessage("Fatura satırlarındaki bir veya daha fazla ürün bulunamadı.")
            .When(x => x.Lines != null && x.Lines.Any());
    }

    private async Task<bool> ContactBelongsToSameBranchAsync(CreateInvoiceCommand cmd, CancellationToken ct)
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

    private async Task<bool> AllItemsExistAsync(CreateInvoiceCommand cmd, CancellationToken ct)
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
