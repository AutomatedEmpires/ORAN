param(
    [Parameter(Position=0)][string]$Command = 'dev',
    [Parameter(ValueFromRemainingArguments=$true)][string[]]$CommandArguments
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskVersion = (Get-Content -Raw -LiteralPath '.node-version').Trim()
if ($taskVersion -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid pinned Node version.' }
$taskArch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
if ($taskArch -notin @('arm64','x64')) { throw 'Use 64-bit Windows PowerShell.' }
$taskTools = Join-Path $taskRoot '.local\toolchain'
$taskName = 'node-v' + $taskVersion + '-win-' + $taskArch
$taskNode = Join-Path $taskTools ($taskName + '\node.exe')
New-Item -ItemType Directory -Force -Path $taskTools | Out-Null
if (-not (Test-Path -LiteralPath $taskNode)) {
    $taskBase = 'https://nodejs.org/dist/v' + $taskVersion + '/'
    $taskArchiveName = $taskName + '.zip'
    $taskArchive = Join-Path $taskTools $taskArchiveName
    Write-Host ('Preparing the pinned Windows ' + $taskArch + ' toolchain in .local (no global changes).')
    $taskChecksums = (Invoke-WebRequest -UseBasicParsing ($taskBase + 'SHASUMS256.txt')).Content
    $taskChecksum = ($taskChecksums -split "`n" | Where-Object { $_.Trim().EndsWith('  ' + $taskArchiveName) } | Select-Object -First 1) -split '\s+'
    if ($taskChecksum[0] -notmatch '^[a-fA-F0-9]{64}$') { throw 'Could not verify the official Node checksum.' }
    Invoke-WebRequest -UseBasicParsing ($taskBase + $taskArchiveName) -OutFile $taskArchive
    if ((Get-FileHash -LiteralPath $taskArchive -Algorithm SHA256).Hash -ne $taskChecksum[0]) { throw 'Node archive checksum mismatch.' }
    Expand-Archive -LiteralPath $taskArchive -DestinationPath $taskTools -Force
    Remove-Item -LiteralPath $taskArchive
}
if ((& $taskNode --version) -ne ('v' + $taskVersion)) { throw 'The local Node version does not match the repository pin.' }
$env:Path = (Split-Path -Parent $taskNode) + ';' + $env:Path
$taskPackage = Get-Content -Raw -LiteralPath 'package.json' | ConvertFrom-Json
if ($taskPackage.packageManager -notmatch '^pnpm@(\d+\.\d+\.\d+)$') { throw 'Invalid pnpm pin.' }
$taskPnpmVersion = $Matches[1]
$taskPnpmRoot = Join-Path $taskTools 'pnpm'
$taskPnpm = Join-Path $taskPnpmRoot 'node_modules\pnpm\bin\pnpm.cjs'
if (-not (Test-Path -LiteralPath $taskPnpm)) {
    $taskNpm = Join-Path (Split-Path -Parent $taskNode) 'node_modules\npm\bin\npm-cli.js'
    & $taskNode $taskNpm install --prefix $taskPnpmRoot --no-package-lock --no-audit --no-fund ('pnpm@' + $taskPnpmVersion)
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare pnpm.' }
}
if ((& $taskNode $taskPnpm --version) -ne $taskPnpmVersion) { throw 'The local pnpm version does not match the repository pin.' }
& $taskNode $taskPnpm $Command @CommandArguments
exit $LASTEXITCODE
