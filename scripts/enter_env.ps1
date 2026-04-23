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
    [string]$WebSearchEndpoint = ""
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

$resolvedMysqlBin = $MysqlBin
if (-not $resolvedMysqlBin) {
    $resolvedMysqlBin = Resolve-ExistingPath @(
        "C:\Program Files\MySQL\MySQL Server 5.7\bin"
    )
}

$resolvedFfmpegBin = $FfmpegBin
if (-not $resolvedFfmpegBin) {
    $resolvedFfmpegBin = Resolve-ExistingPath @(
        "D:\bs\ffmpeg\ffmpeg\bin",
        "D:\ffmpeg\bin"
    )
}

$resolvedTesseractCmd = $TesseractCmd
if (-not $resolvedTesseractCmd) {
    $resolvedTesseractCmd = Resolve-ExistingPath @(
        "C:\Program Files\Tesseract-OCR\tesseract.exe",
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    )
}

if ($resolvedMysqlBin -and -not $env:Path.Contains($resolvedMysqlBin)) {
    $env:Path += ";$resolvedMysqlBin"
}

if ($resolvedFfmpegBin -and -not $env:Path.Contains($resolvedFfmpegBin)) {
    $env:Path += ";$resolvedFfmpegBin"
}

if ($resolvedTesseractCmd) {
    $env:TESSERACT_CMD = $resolvedTesseractCmd
}

$env:DB_HOST = $DbHost
$env:DB_PORT = $DbPort
$env:DB_NAME = $DbName
$env:DB_USER = $DbUser
if ($DbPassword) {
    $env:DB_PASSWORD = $DbPassword
}

$env:WEB_SEARCH_ENABLED = $(if ($EnableWebSearch) { "true" } else { "false" })
$env:WEB_SEARCH_ENDPOINT = $WebSearchEndpoint

Write-Host "Environment variables loaded for current shell." -ForegroundColor Green
Write-Host "  DB_HOST      = $($env:DB_HOST)"
Write-Host "  DB_PORT      = $($env:DB_PORT)"
Write-Host "  DB_NAME      = $($env:DB_NAME)"
Write-Host "  DB_USER      = $($env:DB_USER)"
Write-Host "  DB_PASSWORD  = $(if ($env:DB_PASSWORD) { '*** set ***' } else { '<empty>' })"
Write-Host "  MySQL CLI    = $(if ($resolvedMysqlBin) { $resolvedMysqlBin } else { 'not found' })"
Write-Host "  FFmpeg       = $(if ($resolvedFfmpegBin) { $resolvedFfmpegBin } else { 'not found' })"
Write-Host "  Tesseract    = $(if ($resolvedTesseractCmd) { $resolvedTesseractCmd } else { 'not found' })"
Write-Host "  Web Search   = $(if ($EnableWebSearch) { $WebSearchEndpoint } else { 'disabled' })"
