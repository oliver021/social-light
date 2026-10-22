using System.Text.Json;
using System.Text.Json.Serialization;

namespace SocialLight.ContentEngine.Infrastructure;

/// <summary>Shared JSON settings: camelCase, indented, enums as strings, null-skipping.</summary>
public static class Json
{
    public static readonly JsonSerializerOptions Options = Build();

    /// <summary>Single-line variant for JSON-lines ledger records.</summary>
    public static readonly JsonSerializerOptions Compact = new(Options) { WriteIndented = false };

    private static JsonSerializerOptions Build()
    {
        var o = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            WriteIndented = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        };
        o.Converters.Add(new JsonStringEnumConverter());
        return o;
    }

    /// <summary>
    /// Normalizes a <c>Data</c> value to a string whether it was authored
    /// in-process (a <see cref="string"/>) or round-tripped through the seed
    /// file (a <see cref="JsonElement"/>).
    /// </summary>
    public static string? AsString(object? value) => value switch
    {
        null => null,
        string s => s,
        JsonElement e => e.ValueKind == JsonValueKind.String ? e.GetString() : e.ToString(),
        _ => value.ToString(),
    };

    /// <summary>Normalizes a <c>Data</c> integer value (in-process or round-tripped).</summary>
    public static int? AsInt(object? value) => value switch
    {
        null => null,
        int i => i,
        long l => (int)l,
        JsonElement e when e.ValueKind == JsonValueKind.Number => e.GetInt32(),
        _ => int.TryParse(value.ToString(), out var n) ? n : null,
    };
}
