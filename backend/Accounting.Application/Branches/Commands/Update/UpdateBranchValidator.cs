using Accounting.Application.Common.Abstractions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Branches.Commands.Update;

public class UpdateBranchValidator : AbstractValidator<UpdateBranchCommand>
{
    private readonly IAppDbContext _context;

    public UpdateBranchValidator(IAppDbContext context)
    {
        _context = context;

        RuleFor(x => x.Id).GreaterThan(0);

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Şube kodu boş olamaz.")
            .MaximumLength(32).WithMessage("Şube kodu en fazla 32 karakter olabilir.")
            .MustAsync(BeUniqueCode).WithMessage("Bu şube kodu zaten kullanılıyor.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Şube adı boş olamaz.")
            .MaximumLength(128).WithMessage("Şube adı en fazla 128 karakter olabilir.");
        
        RuleFor(x => x.RowVersionBase64).NotEmpty().WithMessage("RowVersion gereklidir.");
    }

    private async Task<bool> BeUniqueCode(UpdateBranchCommand command, string code, CancellationToken cancellationToken)
    {
        // Kendisi hariç diğerlerinde ara
        return !await _context.Branches
            .AnyAsync(x => x.Code == code && x.Id != command.Id, cancellationToken);
    }
}
