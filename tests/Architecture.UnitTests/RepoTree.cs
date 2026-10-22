using System.Text.RegularExpressions;

namespace Architecture.UnitTests;

/// <summary>Locates the repo and enumerates the social modules under <c>src/Modules</c>.</summary>
internal static class RepoTree
{
    public static readonly string Root = FindRoot();
    public static string ModulesDir => Path.Combine(Root, "src", "Modules");

    /// <summary>Modules that follow the canonical form (have a <c>X.API</c> project).</summary>
    public static IReadOnlyList<string> Modules { get; } = Directory.GetDirectories(ModulesDir)
        .Select(d => Path.GetFileName(d)!)
        .Where(n => File.Exists(Path.Combine(ModulesDir, n, $"{n}.API", $"{n}.API.csproj")))
        .OrderBy(n => n, StringComparer.Ordinal)
        .ToList();

    public static IEnumerable<object[]> ModuleData() => Modules.Select(m => new object[] { m });

    public static string ApiDir(string module) => Path.Combine(ModulesDir, module, $"{module}.API");

    /// <summary>Project names referenced by a csproj (file name without extension).</summary>
    public static IReadOnlyList<string> ProjectReferences(string csproj) =>
        Regex.Matches(File.ReadAllText(csproj), "<ProjectReference\\s+Include=\"([^\"]+)\"")
            .Select(m => Path.GetFileNameWithoutExtension(m.Groups[1].Value.Replace('\\', '/')))
            .ToList();

    public static IEnumerable<string> SourceFiles(string dir) =>
        Directory.EnumerateFiles(dir, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")
                     && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}"));

    private static string FindRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "global.json"))) dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("repo root (global.json) not found");
    }
}
