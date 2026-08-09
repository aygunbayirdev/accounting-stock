using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Interfaces;
using Accounting.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Cheques.Commands.Create;

public class CreateChequeValidator : AbstractValidator<CreateChequeCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUserService;

    public CreateChequeValidator(IAppDbContext db, ICurrentUserService currentUserService)
    {
        _db = db;
        _currentUserService = currentUserService;

        // RuleFor(x => x.BranchId).GreaterThan(0); // Removed
        RuleFor(x => x.ChequeNumber).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.DueDate).GreaterThanOrEqualTo(x => x.IssueDate).WithMessage("Vade tarihi düzenleme tarihinden önce olamaz.");

        // Müşteri çeki ise Contact zorunlu
        RuleFor(x => x.ContactId)
            .NotEmpty()
            .When(x => x.Direction == ChequeDirection.Inbound)
            .WithMessage("Müşteri evrağı girişinde cari seçimi zorunludur.");

        // Contact Branch Consistency
        RuleFor(x => x)
            .MustAsync(ContactBelongsToSameBranchAsync)
            .WithMessage("Seçilen cari (Contact) bu şubeye ait değil.")
            .When(x => x.ContactId.HasValue);
    }

    private async Task<bool> ContactBelongsToSameBranchAsync(CreateChequeCommand cmd, CancellationToken ct)
    {
        if (!_currentUserService.BranchId.HasValue) return false;
        var currentBranchId = _currentUserService.BranchId.Value;

        if (!cmd.ContactId.HasValue) return true;

        var contact = await _db.Contacts
            .AsNoTracking()
            .Select(c => new { c.Id, c.BranchId })
            .FirstOrDefaultAsync(c => c.Id == cmd.ContactId.Value, ct);

        if (contact == null) return false; // Cari bulunamadı
        return contact.BranchId == currentBranchId;
    }
}
