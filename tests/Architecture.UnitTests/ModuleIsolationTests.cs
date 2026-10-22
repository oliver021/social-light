using System.Text.RegularExpressions;
using Xunit;

namespace Architecture.UnitTests;

/// <summary>
/// The project's thesis is that redundant structure is generated, so it must be *uniform* and
/// *isolated* (code-engine/DESIGN-STRATEGY.md §1, §4). These tests fail if hand edits break
/// either property for any module.
/// </summary>
public class ModuleIsolationTests
{
    private static string Csproj(string module, string project) =>
        Path.Combine(RepoTree.ModulesDir, module, project, $"{project}.csproj");

    [Fact]
    public void There_are_many_modules_following_the_canonical_form()
        => Assert.True(RepoTree.Modules.Count >= 10, $"found only {RepoTree.Modules.Count} modules");

    [Theory, MemberData(nameof(Modules))]
    public void Module_api_references_no_other_module(string module)
    {
        var others = RepoTree.Modules.Where(m => m != module).ToHashSet();
        var offenders = RepoTree.ProjectReferences(Csproj(module, $"{module}.API"))
            .Where(p => others.Any(o => p.StartsWith(o + ".", StringComparison.Ordinal)))
            .ToList();
        Assert.Empty(offenders);
    }

    [Theory, MemberData(nameof(Modules))]
    public void Module_api_depends_on_its_own_contracts(string module)
        => Assert.Contains($"{module}.Contracts", RepoTree.ProjectReferences(Csproj(module, $"{module}.API")));

    [Theory, MemberData(nameof(Modules))]
    public void Contracts_project_is_a_leaf_that_references_no_module(string module)
    {
        var path = Csproj(module, $"{module}.Contracts");
        if (!File.Exists(path)) return;
        var offenders = RepoTree.ProjectReferences(path)
            .Where(p => RepoTree.Modules.Any(o => p.StartsWith(o + ".", StringComparison.Ordinal)))
            .ToList();
        Assert.Empty(offenders);
    }

    [Theory, MemberData(nameof(Modules))]
    public void Module_source_never_touches_another_modules_internals(string module)
    {
        // Another module's *Contracts* (DTOs, integration events) are the allowed seam;
        // its API / Domain / Infrastructure namespaces are not.
        var forbidden = RepoTree.Modules.Where(m => m != module)
            .Select(o => new Regex($@"\bSocialLight\.{o}\.(API|Domain|Infrastructure)\b")).ToList();
        var hits = RepoTree.SourceFiles(RepoTree.ApiDir(module))
            .Where(f => { var t = File.ReadAllText(f); return forbidden.Any(r => r.IsMatch(t)); })
            .Select(f => Path.GetRelativePath(RepoTree.Root, f)).ToList();
        Assert.Empty(hits);
    }

    [Theory, MemberData(nameof(Modules))]
    public void Module_has_the_canonical_layout(string module)
    {
        var dir = RepoTree.ApiDir(module);
        foreach (var sub in new[] { "Api", "Domain", "Infrastructure", "IntegrationEvents" })
            Assert.True(Directory.Exists(Path.Combine(dir, sub)), $"{module}.API is missing '{sub}/'");
        Assert.True(File.Exists(Path.Combine(dir, $"{module}ModuleExtensions.cs")),
            $"{module}.API is missing {module}ModuleExtensions.cs");
    }

    [Theory, MemberData(nameof(Modules))]
    public void Module_owns_its_data_through_a_schema(string module)
    {
        var contexts = RepoTree.SourceFiles(Path.Combine(RepoTree.ApiDir(module), "Infrastructure"))
            .Where(f => f.EndsWith("DbContext.cs", StringComparison.Ordinal)).ToList();
        Assert.NotEmpty(contexts);
        Assert.Contains(contexts, f => Regex.IsMatch(File.ReadAllText(f), @"HasDefaultSchema\(\s*""[a-z_]+""\s*\)"));
    }

    [Fact]
    public void Schema_names_are_unique_across_modules()
    {
        var schemas = RepoTree.Modules
            .SelectMany(m => RepoTree.SourceFiles(RepoTree.ApiDir(m)))
            .SelectMany(f => Regex.Matches(File.ReadAllText(f), @"HasDefaultSchema\(\s*""([^""]+)""\s*\)").Select(x => x.Groups[1].Value))
            .ToList();
        Assert.NotEmpty(schemas);
        Assert.Equal(schemas.Count, schemas.Distinct().Count());
    }

    [Fact]
    public void Postgres_is_the_provider_and_sql_server_is_not_used()
    {
        var props = File.ReadAllText(Path.Combine(RepoTree.Root, "Directory.Packages.props"));
        Assert.Contains("Npgsql", props);
        var csprojs = Directory.EnumerateFiles(Path.Combine(RepoTree.Root, "src"), "*.csproj", SearchOption.AllDirectories);
        Assert.DoesNotContain(csprojs, f => File.ReadAllText(f).Contains("EntityFrameworkCore.SqlServer"));
    }

    [Fact]
    public void Payment_path_stays_deliberately_unbuilt()
    {
        // CLAUDE.md §0: checkout is out of scope and must fail loudly, not be half-implemented.
        var basket = File.ReadAllText(Path.Combine(RepoTree.Root, "src", "Basket.API", "Apis", "BasketApi.cs"));
        Assert.Contains("NotImplementedException", basket);
    }

    public static IEnumerable<object[]> Modules() => RepoTree.ModuleData();
}
