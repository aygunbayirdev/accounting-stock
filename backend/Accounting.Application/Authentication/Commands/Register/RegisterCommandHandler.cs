using Accounting.Application.Authentication.Common;
using Accounting.Application.Common.Abstractions;
using Accounting.Application.Common.Exceptions;
using Accounting.Application.Common.Interfaces;
using Accounting.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Accounting.Application.Authentication.Commands.Register;

public class RegisterCommandHandler(
    IAppDbContext context,
    IPasswordHasher passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator) : IRequestHandler<RegisterCommand, AuthenticationResult>
{
    public async Task<AuthenticationResult> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        // 1. Validate Email Uniqueness
        if (await context.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
        {
            // BusinessRuleException is generic, maybe add DuplicateEmailException later.
            // For now generic business rule.
            throw new BusinessRuleException($"User with email {request.Email} already exists.");
        }

        // 2. Hash Password
        var passwordHash = passwordHasher.HashPassword(request.Password);

        // 3. Create User
        var user = new User
        {
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = passwordHash,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow
        };

        // 4. Assign Default Role (Optional for MVP: "User" role if exists?)
        // Let's check for 'User' role and assign if exists.
        // Or if it's the FIRST user, make them Admin?
        // Let's verify 'Admin' role exists in Seed. If not found, just simple user.
        // For MVP simplicity: Just create user. Roles managed by Admin later.
        // But for Permissions to work in Token, they need a role.
        // Let's fetch "User" role.
        var userRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "User", cancellationToken);
        if (userRole != null)
        {
            user.UserRoles.Add(new UserRole { RoleId = userRole.Id });
        }

        context.Users.Add(user);
        await context.SaveChangesAsync(cancellationToken);

        // 5. Generate Token
        // Need to load permissions for token generation (even if empty for now)
        var permissions = userRole?.Permissions.Select(p => p.Permission).ToList() ?? new List<string>();

        var accessToken = jwtTokenGenerator.GenerateAccessToken(user, permissions);
        var (refreshToken, refreshTokenExpiry) = jwtTokenGenerator.GenerateRefreshToken();
        
        // Save Refresh Token
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = refreshTokenExpiry;
        
        await context.SaveChangesAsync(cancellationToken);

        return new AuthenticationResult(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            accessToken,
            refreshToken
        );
    }
}
