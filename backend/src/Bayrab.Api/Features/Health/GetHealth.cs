using Bayrab.Api.Common.Endpoints;

namespace Bayrab.Api.Features.Health;

/// <summary>Liveness probe. Also the first slice, proving the endpoint scan works.</summary>
public sealed class GetHealth : IEndpoint
{
    public sealed record Response(string Status);

    public void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/health", () => TypedResults.Ok(new Response("ok")))
            .WithName("getHealth")
            .AllowAnonymous();
}
