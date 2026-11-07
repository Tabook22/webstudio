# Rebuild the Windows installer: desktop\output\WebStudio-Setup.exe
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File desktop\build.ps1

$ErrorActionPreference = "Stop"
$desktop = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $desktop
$python = Join-Path $root "backend\.venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    throw "The project Python is missing. Create backend\.venv first."
}

Push-Location (Join-Path $root "frontend")
try {
    npm run build
} finally {
    Pop-Location
}

& $python (Join-Path $desktop "make_icon.py")
& $python -m pip install -r (Join-Path $desktop "requirements-build.txt")

# Build outside OneDrive. A cloud folder locks files while PyInstaller is writing them.
$work = Join-Path $env:LOCALAPPDATA "WebStudioBuild"
New-Item -ItemType Directory -Force -Path $work | Out-Null
& $python -m PyInstaller (Join-Path $desktop "webstudio.spec") --noconfirm `
    --distpath (Join-Path $work "output") `
    --workpath (Join-Path $work "build")

$iscc = @(
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$built = Join-Path $work "output\WebStudio"
if (-not $iscc) {
    Write-Host "Inno Setup is not installed, so the Setup file was not compiled."
    Write-Host "The runnable program is $built\Web Studio.exe"
    exit 0
}

Push-Location $desktop
try {
    & $iscc "/DDistDir=$built" "webstudio.iss"
} finally {
    Pop-Location
}
