using System.Text.Json;
using SocialLight.ContentEngine.Cli;
using SocialLight.ContentEngine.Infrastructure;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Io;

/// <summary>Reads the scenario plan that seeds a run.</summary>
public static class SeedIo
{
    public static Task<ScenarioPlan> ReadPlanAsync(string path) => JsonFile.ReadAsync<ScenarioPlan>(path);
}

/// <summary>Typed, indented JSON file read/write with friendly CLI errors.</summary>
public static class JsonFile
{
    public static async Task<T> ReadAsync<T>(string path)
    {
        if (!File.Exists(path))
            throw new CliException($"file not found: {path}");

        var json = await File.ReadAllTextAsync(path);
        try
        {
            return JsonSerializer.Deserialize<T>(json, Json.Options)
                   ?? throw new CliException($"{path}: parsed to null");
        }
        catch (JsonException ex)
        {
            throw new CliException($"{path}: invalid JSON — {ex.Message}");
        }
    }

    public static async Task WriteAsync<T>(string path, T value)
    {
        var dir = Path.GetDirectoryName(Path.GetFullPath(path));
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(path, JsonSerializer.Serialize(value, Json.Options));
    }
}
