using Accounting.Application.Branches.Commands.Create;
using Accounting.Application.Common.Abstractions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Branches.Commands.Create;

public class CreateBranchValidator : AbstractValidator<CreateBranchCommand>
{
    private readonly IAppDbContext _context;

    public CreateBranchValidator(IAppDbContext context)
    {
        _context = context;

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Şube kodu boş olamaz.")
            .MaximumLength(32).WithMessage("Şube kodu en fazla 32 karakter olabilir.")
            .MustAsync(BeUniqueCode).WithMessage("Bu şube kodu zaten kullanılıyor.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şube adı boş olamaz.")
            .MaximumLength(128).WithMessage("Şube adı en fazla 128 karakter olabilir.");
    }

    private async Task<bool> BeUniqueCode(string code, CancellationToken cancellationToken)
    {
        return !await _context.Branches
            .AnyAsync(x => x.Code == code, cancellationToken);
    }
}
