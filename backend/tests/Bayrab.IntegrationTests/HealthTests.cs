using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Bayrab.IntegrationTests;

/// <summary>Smoke test for the host and endpoint scan. Database-backed tests arrive with the Phase 2 fixture.</summary>
public class HealthTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_endpoint_is_found_by_the_slice_scan()
    {
        var client = factory.CreateClient();

        var body = await client.GetFromJsonAsync<Dictionary<string, string>>("/api/v1/health", TestContext.Current.CancellationToken);

        body.ShouldNotBeNull()["status"].ShouldBe("ok");
    }
}
