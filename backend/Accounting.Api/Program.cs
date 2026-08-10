using Accounting.Api.Middleware;
using Accounting.Application.Common.Behaviors;
using Accounting.Application.Services;
using Accounting.Infrastructure;
using Accounting.Infrastructure.Persistence;
using Accounting.Infrastructure.Persistence.Seed;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((ctx, lc) => lc.ReadFrom.Configuration(ctx.Configuration));

// Add services to the container.

// JSON'da parasal alanlar string ("1234.56") olarak gelebilir.
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.NumberHandling =
        System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString;
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle       
builder.Services.AddEndpointsApiExplorer();

// Swagger Security
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Accounting.Api", Version = "v1" });
    c.MapType<decimal>(() => new OpenApiSchema { Type = "string", Format = "decimal" });       
    c.MapType<decimal?>(() => new OpenApiSchema { Type = "string", Format = "decimal" });

    // JWT Support in Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

builder.Services.AddProblemDetails();

// Auth Configuration
// This local instance is only used to configure JwtBearerOptions below, which needs a
// concrete value at startup (not a DI-resolved IOptions<T>). The DI-visible
// IOptions<JwtSettings> (used by JwtTokenGenerator etc.) comes exclusively from
// services.Configure<JwtSettings>(...) in Accounting.Infrastructure/DependencyInjection.cs —
// there used to be a second, redundant registration here that bound the same section twice.
var jwtSettings = new Accounting.Infrastructure.Authentication.JwtSettings();
builder.Configuration.Bind(Accounting.Infrastructure.Authentication.JwtSettings.SectionName, jwtSettings);

if (string.IsNullOrWhiteSpace(jwtSettings.Secret) || jwtSettings.Secret.Length < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret is missing or shorter than 32 characters. Set it via the " +
        "JwtSettings__Secret environment variable (docker-compose reads this from .env) " +
        "or `dotnet user-secrets set \"JwtSettings:Secret\" \"...\"` for local development. " +
        "There is no built-in default — a hardcoded fallback would be a security hole.");
}

builder.Services.AddAuthentication(defaultScheme: Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtSettings.Secret))
        };
    });

// MediatR + FluentValidation
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Accounting.Application.Invoices.Commands.Create.CreateInvoiceCommand).Assembly));
builder.Services.AddValidatorsFromAssemblyContaining<Accounting.Application.Invoices.Commands.Create.CreateInvoiceValidator>();

// Pipeline Behaviors
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));    
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));   

// CORS
// Cors:AllowedOrigins in config (env var Cors__AllowedOrigins__0, __1, ...) so a real
// deployment can add its actual frontend origin without a code change. Falls back to the
// local dev ports when the section is absent.
var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", p => p
        .WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials() // Cookie based auth requires AllowCredentials
    );
});

// Infrastructure (DbContext vs.)
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

var app = builder.Build();

// Middleware pipeline
app.UseSerilogRequestLogging();
app.UseMiddleware<ExceptionToProblemDetailsMiddleware>();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.RoutePrefix = "swagger";
        c.SwaggerEndpoint("v1/swagger.json", "Accounting.Api v1");
    });
}

app.UseHttpsRedirection();

// CORS
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireAuthorization();

app.MapHealthChecks("/health");

// Database Migration (always) + Demo Seeding (config-gated).
// Seeding:Enabled defaults to true so the docker-compose demo keeps working
// out of the box; set it to false via config/env for a deployment that
// should never get the demo admin/branch/role data.
// Skipped entirely under the "Testing" environment (WebApplicationFactory-based
// integration tests): Database.MigrateAsync() only works against a relational
// provider, and the test host swaps in the EF Core InMemory provider instead.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var seedingEnabled = builder.Configuration.GetValue("Seeding:Enabled", true);
    if (seedingEnabled)
    {
        var invoiceBalanceService = scope.ServiceProvider.GetRequiredService<IInvoiceBalanceService>();
        var accountBalanceService = scope.ServiceProvider.GetRequiredService<IAccountBalanceService>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<Accounting.Application.Common.Interfaces.IPasswordHasher>();
        await DataSeeder.SeedAsync(db, invoiceBalanceService, accountBalanceService, passwordHasher);
    }
}

app.Run();

// Makes the top-level-statement Program class accessible to
// WebApplicationFactory<Program> in the integration test project.
public partial class Program { }
