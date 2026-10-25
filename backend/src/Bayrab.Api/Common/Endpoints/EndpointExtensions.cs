using System.Reflection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Bayrab.Api.Common.Endpoints;

public static class EndpointExtensions
{
    /// <summary>Registers every non-abstract <see cref="IEndpoint"/> in the assembly.</summary>
    public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
    {
        var descriptors = assembly.DefinedTypes
            .Where(t => t is { IsAbstract: false, IsInterface: false } && t.IsAssignableTo(typeof(IEndpoint)))
            .Select(t => ServiceDescriptor.Transient(typeof(IEndpoint), t));
        services.TryAddEnumerable(descriptors);
        return services;
    }

    /// <summary>Maps all registered endpoints under one route group (e.g. <c>/api/v1</c>).</summary>
    public static IEndpointRouteBuilder MapEndpoints(this IEndpointRouteBuilder app, string prefix)
    {
        var group = app.MapGroup(prefix);
        foreach (var endpoint in app.ServiceProvider.GetRequiredService<IEnumerable<IEndpoint>>())
            endpoint.Map(group);
        return app;
    }
}
