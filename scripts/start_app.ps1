param(
    [string]$DbHost = "localhost",
    [string]$DbPort = "3306",
    [string]$DbName = "gov",
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$MysqlBin = "",
    [string]$FfmpegBin = "",
    [string]$TesseractCmd = "",
    [switch]$EnableWebSearch,
    [string]$WebSearchEndpoint = "",
    [string]$PreferredDomains = "gov.cn,www.gov.cn",
    [switch]$OfficialOnly
)

function Resolve-ExistingPath {
    param([string[]]$Candidates)

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }
    return ""
}

if (-not $DbPassword) {
    Write-Host "Please provide the database password with -DbPassword." -ForegroundColor Yellow
    exit 1
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $python)) {
    Write-Host "Virtual environment Python not found: $python" -ForegroundColor Red
    exit 1
}

$resolvedFfmpegBin = $FfmpegBin
if (-not $resolvedFfmpegBin) {
    $resolvedFfmpegBin = Resolve-ExistingPath @(
        "D:\bs\ffmpeg\ffmpeg\bin",
        "D:\ffmpeg\bin"
    )
}

$resolvedMysqlBin = $MysqlBin
if (-not $resolvedMysqlBin) {
    $resolvedMysqlBin = Resolve-ExistingPath @(
        "C:\Program Files\MySQL\MySQL Server 5.7\bin"
    )
}

$resolvedTesseractCmd = $TesseractCmd
if (-not $resolvedTesseractCmd) {
    $resolvedTesseractCmd = Resolve-ExistingPath @(
        "C:\Program Files\Tesseract-OCR\tesseract.exe",
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    )
}

$env:DB_HOST = $DbHost
$env:DB_PORT = $DbPort
$env:DB_NAME = $DbName
$env:DB_USER = $DbUser
$env:DB_PASSWORD = $DbPassword

if ($resolvedMysqlBin) {
    if (-not $env:Path.Contains($resolvedMysqlBin)) {
        $env:Path += ";$resolvedMysqlBin"
    }
}

if ($resolvedFfmpegBin) {
    if (-not $env:Path.Contains($resolvedFfmpegBin)) {
        $env:Path += ";$resolvedFfmpegBin"
    }
}

if ($resolvedTesseractCmd) {
    $env:TESSERACT_CMD = $resolvedTesseractCmd
}

$env:WEB_SEARCH_ENABLED = $(if ($EnableWebSearch) { "true" } else { "false" })
$env:WEB_SEARCH_ENDPOINT = $WebSearchEndpoint
$env:WEB_SEARCH_PREFERRED_DOMAINS = $PreferredDomains
$env:WEB_SEARCH_OFFICIAL_ONLY = $(if ($OfficialOnly) { "true" } else { "false" })

Write-Host "Current settings:" -ForegroundColor Cyan
Write-Host "  DB        : ${DbHost}:${DbPort} / $DbName"
Write-Host "  MySQL CLI : $(if ($resolvedMysqlBin) { $resolvedMysqlBin } else { 'Use existing PATH' })"
Write-Host "  FFmpeg    : $(if ($resolvedFfmpegBin) { $resolvedFfmpegBin } else { 'Use existing PATH' })"
Write-Host "  Tesseract : $(if ($resolvedTesseractCmd) { $resolvedTesseractCmd } else { 'not configured' })"
Write-Host "  Web       : $(if ($EnableWebSearch) { $WebSearchEndpoint } else { 'disabled' })"

& $python (Join-Path $projectRoot "app.py")
