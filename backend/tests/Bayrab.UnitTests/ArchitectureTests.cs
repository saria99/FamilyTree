using System.Reflection;
using NetArchTest.Rules;

namespace Bayrab.UnitTests;

/// <summary>Vertical-slice boundaries (research R28): slices stay independent, Domain stays pure.</summary>
public class ArchitectureTests
{
    private static readonly Assembly Api = typeof(Program).Assembly;
    private const string Root = "Bayrab.Api";

    [Fact]
    public void Domain_does_not_depend_on_features_infrastructure_ef_or_aspnet()
    {
        var result = Types.InAssembly(Api)
            .That().ResideInNamespace($"{Root}.Domain")
            .ShouldNot().HaveDependencyOnAny(
                $"{Root}.Features",
                $"{Root}.Infrastructure",
                $"{Root}.Common",
                "Microsoft.EntityFrameworkCore",
                "Microsoft.AspNetCore")
            .GetResult();

        result.IsSuccessful.ShouldBeTrue(Failures(result));
    }

    [Fact]
    public void Feature_areas_do_not_reference_each_other()
    {
        var areas = Api.GetTypes()
            .Select(t => t.Namespace)
            .Where(ns => ns is not null && ns.StartsWith($"{Root}.Features."))
            .Select(ns => ns!.Split('.')[3])
            .Distinct()
            .ToList();

        areas.ShouldNotBeEmpty();
        foreach (var area in areas)
        {
            var others = areas.Where(a => a != area).Select(a => $"{Root}.Features.{a}").ToArray();
            if (others.Length == 0) continue;
            var result = Types.InAssembly(Api)
                .That().ResideInNamespace($"{Root}.Features.{area}")
                .ShouldNot().HaveDependencyOnAny(others)
                .GetResult();

            result.IsSuccessful.ShouldBeTrue($"{area}: {Failures(result)}");
        }
    }

    private static string Failures(NetArchTest.Rules.TestResult result) =>
        string.Join(", ", result.FailingTypeNames ?? []);
}
