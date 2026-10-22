#requires -Version 5.1
<#
.SYNOPSIS
    Rebrands the eShop namespace token to SocialLight across C# source files.

.DESCRIPTION
    socialLight is built on the dotnet/eShop codebase (now living in the repo as
    the working base under _eshop_ref/). This migration script walks every .cs
    file, and - for files that contain a C# namespace/using declaration - renames
    the whole-word token 'eShop' to 'SocialLight'. This is a deterministic,
    redundant transformation (no inference required), in the spirit of the
    project's code-engine experiment.

    By default it rewrites every occurrence of the token in qualifying files so
    the code still compiles (namespace declarations AND the matching using
    statements / qualified references). Pass -NamespaceDeclarationsOnly to limit
    edits to 'namespace' / 'using' lines only.

    Files are written back as UTF-8 with BOM (the eShop convention) and original
    CRLF line endings are preserved.

.PARAMETER Root
    Directory to scan recursively. Defaults to the repository root (one level up
    from this script). bin/obj/.git/node_modules/.out are always skipped.

.PARAMETER OldName
    Token to replace. Default: eShop.

.PARAMETER NewName
    Replacement token. Default: SocialLight.

.PARAMETER NamespaceDeclarationsOnly
    Only rewrite 'namespace' / 'using' (incl. 'global using') lines, leaving
    other occurrences untouched. Literal interpretation of "rename the namespace
    in the head of the file" - note this can leave a project non-compiling if
    types are referenced by their fully-qualified eShop.* name elsewhere.

.EXAMPLE
    # Preview every change without writing anything:
    .\scripts\Rename-Namespaces.ps1 -WhatIf

.EXAMPLE
    # Apply the rename across the whole repo:
    .\scripts\Rename-Namespaces.ps1

.EXAMPLE
    # Only the eShop reference base, declarations only:
    .\scripts\Rename-Namespaces.ps1 -Root .\_eshop_ref -NamespaceDeclarationsOnly
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string] $Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string] $OldName = 'eShop',
    [string] $NewName = 'SocialLight',
    [switch] $NamespaceDeclarationsOnly
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

# Whole-word token, e.g. matches 'eShop' in 'namespace eShop.Ordering.Domain;'
# and 'using eShop.EventBus;' but not a hypothetical 'eShopomatic'.
$escaped     = [regex]::Escape($OldName)
$tokenRegex  = [regex]::new("\b$escaped\b")
# A namespace / using / global using line (used both as a gate and, in
# -NamespaceDeclarationsOnly mode, as the only region we touch).
$declRegex   = [regex]::new("(?m)^\s*(?:global\s+)?(?:namespace|using)\b.*$")

# Preserve the eShop convention: UTF-8 *with* BOM.
$utf8Bom = New-Object System.Text.UTF8Encoding($true)

$skip = '\\(bin|obj|node_modules|\.git|\.out|\.vs)\\'

Write-Host "Root   : $Root"
Write-Host "Rename : $OldName -> $NewName"
$modeText = if ($NamespaceDeclarationsOnly) { 'namespace/using lines only' } else { 'all occurrences in files that declare a namespace/using' }
Write-Host "Mode   : $modeText"
Write-Host ""

$files = Get-ChildItem -Path $Root -Recurse -File -Filter *.cs |
    Where-Object { $_.FullName -notmatch $skip }

$filesChanged = 0
$totalRenames = 0

foreach ($file in $files) {
    $text = [System.IO.File]::ReadAllText($file.FullName)

    # Spec gate: only act on files that actually contain a namespace/using
    # declaration, and only when the old token is present at all.
    if (-not $declRegex.IsMatch($text)) { continue }
    if (-not $tokenRegex.IsMatch($text)) { continue }

    if ($NamespaceDeclarationsOnly) {
        # Count + replace the token only within declaration lines.
        $count = 0
        foreach ($line in $declRegex.Matches($text)) {
            $count += $tokenRegex.Matches($line.Value).Count
        }
        if ($count -eq 0) { continue }
        $newText = $declRegex.Replace(
            $text,
            [System.Text.RegularExpressions.MatchEvaluator] { param($m) $tokenRegex.Replace($m.Value, $NewName) }
        )
    }
    else {
        $count = $tokenRegex.Matches($text).Count
        $newText = $tokenRegex.Replace($text, $NewName)
    }

    if ($newText -eq $text) { continue }

    $rel = $file.FullName.Substring($Root.Length).TrimStart('\', '/')
    if ($PSCmdlet.ShouldProcess($rel, "rename $count occurrence(s) of '$OldName'")) {
        [System.IO.File]::WriteAllText($file.FullName, $newText, $utf8Bom)
        Write-Host ("  edited  {0,4}  {1}" -f $count, $rel)
    }
    else {
        Write-Host ("  would   {0,4}  {1}" -f $count, $rel)
    }

    $filesChanged++
    $totalRenames += $count
}

Write-Host ""
Write-Host "Files changed : $filesChanged"
Write-Host "Total renames : $totalRenames"
if ($WhatIfPreference) {
    Write-Host "(dry run - no files were written; drop -WhatIf to apply)"
}
