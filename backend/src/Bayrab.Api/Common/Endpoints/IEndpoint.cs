namespace Bayrab.Api.Common.Endpoints;

/// <summary>
/// One use case's HTTP route. Every slice in <c>Features/</c> implements this; <see cref="EndpointExtensions"/>
/// finds them by assembly scan, so adding a slice never touches Program.cs.
/// </summary>
public interface IEndpoint
{
    void Map(IEndpointRouteBuilder app);
}
