#requires -Version 5.1
<#
.SYNOPSIS
    Full eShop -> SocialLight rebrand: file CONTENT + file/folder NAMES.

.DESCRIPTION
    A superset of Rename-Namespaces.ps1. Where that script only rewrites C#
    namespace/using lines, this one performs the *whole* rebrand needed to make
    the solution build under the SocialLight name:

      1. Content: replaces the token in source, project, solution, and config
         files (.cs/.csproj/.slnx/.slnf/.props/.targets/.proto/.xaml/.razor/
         .json/.yml/.ts/.html/.svg/.http/.config/.ps1 ...). UTF-8 BOM state and
         CRLF line endings are preserved per file.
      2. Names: renames every file and folder whose name contains the token
         (e.g. eShop.AppHost -> SocialLight.AppHost, eShop.slnx ->
         SocialLight.slnx, EShopJsonSerializerContext.cs -> ...).

    Both the lower-case 'eShop' token and the glued PascalCase form 'EShop'
    (as in EShopJsonSerializerContext) are handled.

    DELIBERATELY LEFT ALONE (attribution / upstream pointers):
      - Markdown docs (*.md) and LICENSE - they credit dotnet/eShop and contain
        the real upstream GitHub URLs.
      - img/ screenshots, scripts/ (these very tools reference 'eShop' as data),
        and code-engine/ (not eShop-derived).

    This is a deterministic, redundant transformation - the same spirit as the
    code-engine experiment.

.PARAMETER Root
    Directory to process. Defaults to the repo root (one level up from scripts/).

.PARAMETER Apply
    Actually write changes. Without it the script previews only (safe default).

.EXAMPLE
    .\scripts\Rebrand-Solution.ps1            # preview
    .\scripts\Rebrand-Solution.ps1 -Apply     # do it
#>
[CmdletBinding()]
param(
    [string] $Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string] $OldName = 'eShop',
    [string] $NewName = 'SocialLight',
    [switch] $Apply
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

# Text file types we rewrite. Markdown is intentionally excluded.
$contentExt = @(
    '.cs', '.csproj', '.sln', '.slnx', '.slnf', '.props', '.targets',
    '.proto', '.xaml', '.razor', '.cshtml', '.json', '.yml', '.yaml',
    '.ts', '.js', '.html', '.css', '.svg', '.http', '.config', '.ps1',
    '.cmd', '.sh', '.xml', '.bicep'
)

# Never descend into these (content or rename).
$skipDirRx  = '\\(\.git|bin|obj|node_modules|\.vs|\.out|img|scripts|code-engine)\\'
# Files never rewritten by name match.
$skipNameRx = '^(LICENSE)$'

# Case variants of the old token: 'eShop' and the PascalCase-glued 'EShop'.
$oldVariants = @($OldName, ([string][char]::ToUpper($OldName[0]) + $OldName.Substring(1)))
$rxWord  = [regex]::new("\b$([regex]::Escape($oldVariants[0]))\b")          # eShop (whole word)
$rxGlued = [regex]::new("\b$([regex]::Escape($oldVariants[1]))(?=[A-Za-z0-9])")  # EShop... (glued)

Write-Host "Root   : $Root"
Write-Host "Rename : $OldName -> $NewName   (mode: $(if ($Apply) { 'APPLY' } else { 'preview' }))"
Write-Host ""

# ---- Pass 1: file content -------------------------------------------------
$contentFiles = 0
$contentHits  = 0
Get-ChildItem -Path $Root -Recurse -File -Force |
    Where-Object {
        $_.FullName -notmatch $skipDirRx -and
        $_.Name -notmatch $skipNameRx -and
        $contentExt -contains $_.Extension.ToLowerInvariant()
    } |
    ForEach-Object {
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        if ($bytes.Length -eq 0) { return }
        $hasBom = ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191)
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        if ($hasBom) { $text = $text.Substring(1) }

        $count = $rxWord.Matches($text).Count + $rxGlued.Matches($text).Count
        if ($count -eq 0) { return }

        $new = $rxGlued.Replace($rxWord.Replace($text, $NewName), $NewName)
        $rel = $_.FullName.Substring($Root.Length).TrimStart('\', '/')
        if ($Apply) {
            $enc = New-Object System.Text.UTF8Encoding($hasBom)
            [System.IO.File]::WriteAllText($_.FullName, $new, $enc)
        }
        Write-Host ("  {0,-7} {1,4}  {2}" -f $(if ($Apply) { 'edit' } else { 'would' }), $count, $rel)
        $script:contentFiles++
        $script:contentHits += $count
    }

# ---- Pass 2: file & folder names (deepest first) --------------------------
$renamed = 0
Get-ChildItem -Path $Root -Recurse -Force |
    Where-Object {
        $_.FullName -notmatch $skipDirRx -and
        ($_.Name -cmatch $oldVariants[0] -or $_.Name -cmatch $oldVariants[1])
    } |
    Sort-Object { $_.FullName.Length } -Descending |
    ForEach-Object {
        $newBase = $_.Name
        foreach ($v in $oldVariants) { $newBase = $newBase -creplace [regex]::Escape($v), $NewName }
        if ($newBase -eq $_.Name) { return }
        $rel = $_.FullName.Substring($Root.Length).TrimStart('\', '/')
        if ($Apply) { Rename-Item -LiteralPath $_.FullName -NewName $newBase }
        Write-Host ("  {0,-7}      {1}  ->  {2}" -f $(if ($Apply) { 'rename' } else { 'would' }), $rel, $newBase)
        $script:renamed++
    }

Write-Host ""
Write-Host "Content: $contentFiles file(s), $contentHits replacement(s)"
Write-Host "Names  : $renamed item(s) renamed"
if (-not $Apply) { Write-Host "(preview only - re-run with -Apply to write)" }
