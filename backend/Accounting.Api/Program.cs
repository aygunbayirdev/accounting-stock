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
var jwtSettings = new Accounting.Infrastructure.Authentication.JwtSettings();
builder.Configuration.Bind(Accounting.Infrastructure.Authentication.JwtSettings.SectionName, jwtSettings);

builder.Services.AddSingleton(Microsoft.Extensions.Options.Options.Create(jwtSettings));

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
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", p => p
        .WithOrigins(
            "http://localhost:3000", // Next.js / React
            "http://localhost:4200"  // Angular
        )
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

// Database Migration + Seeding
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var invoiceBalanceService = scope.ServiceProvider.GetRequiredService<IInvoiceBalanceService>();
    var accountBalanceService = scope.ServiceProvider.GetRequiredService<IAccountBalanceService>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<Accounting.Application.Common.Interfaces.IPasswordHasher>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db, invoiceBalanceService, accountBalanceService, passwordHasher);
}

app.Run();
