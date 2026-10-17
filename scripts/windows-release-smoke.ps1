param(
    [Parameter(Mandatory)][string]$Installer,
    [Parameter(Mandatory)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
    [Parameter(Mandatory)][ValidatePattern('^\d+\.\d+\.\d+$')][string]$ExpectedVersion
)

# Disposable Windows runner only. This exercises the real NSIS package without
# accepting product terms, activating a licence, or contacting customer accounts.
# NSIS switches: https://nsis.sourceforge.io/Docs/Chapter3.html#installerusage
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true' -or $env:RUNNER_OS -ne 'Windows') {
    throw 'Run only on an isolated GitHub Actions Windows runner'
}
$installerPath = (Resolve-Path $Installer).Path
$installPath = Join-Path $env:RUNNER_TEMP 'Chapbook-Smoke'
if (Test-Path $installPath) { throw 'Refusing to reuse an existing installation' }
$evidence = [ordered]@{
    checkedAt = [DateTime]::UtcNow.ToString('o')
    runner = $env:ImageOS
    releaseVersion = $ExpectedVersion
    installerSha256 = (Get-FileHash $installerPath -Algorithm SHA256).Hash.ToLowerInvariant()
    authenticodeStatus = (Get-AuthenticodeSignature $installerPath).Status.ToString()
    checks = [ordered]@{}
    limitations = @('Process startup is not an interactive UI, accessibility or real-device workflow test.',
                   'Unsigned packages still require a separate Windows signing/reputation decision.')
}
$app = $null
$failure = $null
try {
    if ($evidence.installerSha256 -ne $ExpectedSha256.ToLowerInvariant()) { throw 'Installer digest mismatch' }
    $evidence.checks.digest = 'pass'
    $install = Start-Process -FilePath $installerPath -ArgumentList "/S /D=$installPath" -PassThru
    if (-not $install.WaitForExit(180000)) { throw 'Installer timed out' }
    if ($install.ExitCode -ne 0) { throw "Installer exited $($install.ExitCode)" }
    $exe = Join-Path $installPath 'Chapbook.exe'
    if (-not (Test-Path $exe)) { throw 'Installed executable is missing' }
    $versionInfo = (Get-Item $exe).VersionInfo
    if ($versionInfo.ProductVersion -notlike "$ExpectedVersion*") { throw 'Installed product version mismatch' }
    $evidence.checks.install = 'pass'
    $evidence.installedProductVersion = $versionInfo.ProductVersion
    $evidence.installedFileCount = @(Get-ChildItem $installPath -Recurse -File).Count
    $evidence.installedBytes = (Get-ChildItem $installPath -Recurse -File | Measure-Object Length -Sum).Sum
    if ($evidence.installedBytes -lt 80000000) { throw 'Unexpectedly small bundle; verify packaged local assets/model' }
    $evidence.checks.bundleSize = 'pass'
    $app = Start-Process -FilePath $exe -PassThru
    Start-Sleep -Seconds 15
    $app.Refresh()
    if ($app.HasExited) { throw "Application exited during startup: $($app.ExitCode)" }
    $evidence.checks.processStartup = 'pass'
    $evidence.appProcessName = $app.ProcessName
    $evidence.appResponding = $app.Responding
    if (-not $app.Responding) { throw 'Application process is unresponsive' }
} catch {
    $failure = $_.Exception.Message
} finally {
    if ($app -and -not $app.HasExited) {
        Stop-Process -Id $app.Id -Force
        $app.WaitForExit(10000) | Out-Null
    }
    try {
        $uninstaller = Join-Path $installPath 'uninstall.exe'
        if (Test-Path $uninstaller) {
            $remove = Start-Process -FilePath $uninstaller -ArgumentList "/S _?=$installPath" -PassThru
            if (-not $remove.WaitForExit(120000)) { throw 'Uninstaller timed out' }
            if ($remove.ExitCode -ne 0) { throw "Uninstaller exited $($remove.ExitCode)" }
            if (Test-Path (Join-Path $installPath 'Chapbook.exe')) { throw 'Application remained after uninstall' }
            $evidence.checks.uninstall = 'pass'
        } elseif ($evidence.checks.install -eq 'pass') {
            throw 'Installed uninstaller is missing'
        }
    } catch {
        if (-not $failure) { $failure = $_.Exception.Message }
        $evidence.checks.uninstall = 'fail: ' + $_.Exception.Message
    }
    $evidence.result = if ($failure) { 'fail' } else { 'pass' }
    if ($failure) { $evidence.failure = $failure }
    $evidence | ConvertTo-Json -Depth 6 | Set-Content -Path 'windows-smoke-evidence.json' -Encoding utf8
}
if ($failure) { throw $failure }
Write-Host 'Installer digest, installation, bundle size, process startup and uninstall passed.'
