using Bayrab.Api.Common.Endpoints;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddEndpoints(typeof(Program).Assembly);

var app = builder.Build();

app.MapOpenApi();
app.MapEndpoints("/api/v1");

app.Run();

/// <summary>Entry point; public so WebApplicationFactory can host the API in integration tests.</summary>
public partial class Program;
