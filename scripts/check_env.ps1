$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot ".venv\Scripts\python.exe"

function Write-Status {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Detail = ""
    )

    $line = "{0,-16} {1,-10} {2}" -f $Name, $Status, $Detail
    switch ($Status) {
        "OK" { Write-Host $line -ForegroundColor Green }
        "WARN" { Write-Host $line -ForegroundColor Yellow }
        "FAIL" { Write-Host $line -ForegroundColor Red }
        default { Write-Host $line }
    }
}

function Test-CommandPath {
    param([string]$CommandName)
    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    return ""
}

Write-Host "Environment check for gov chat prototype" -ForegroundColor Cyan
Write-Host "Project root: $projectRoot"
Write-Host ""

if (Test-Path $python) {
    Write-Status "Python" "OK" $python
} else {
    Write-Status "Python" "FAIL" "Virtualenv Python missing"
    exit 1
}

$pythonDeps = & $python -c "import flask,pymysql,dbutils,sklearn,jieba,whisper,torch,ffmpeg,numpy; print('ok')" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Status "Py packages" "OK" "Core dependencies installed"
} else {
    Write-Status "Py packages" "FAIL" "Missing one or more Python dependencies"
}

$ffmpegPath = Test-CommandPath "ffmpeg"
if ($ffmpegPath) {
    Write-Status "FFmpeg" "OK" $ffmpegPath
} else {
    Write-Status "FFmpeg" "FAIL" "ffmpeg not found in PATH"
}

$mysqlPath = Test-CommandPath "mysql"
if (-not $mysqlPath) {
    $mysqlPath = "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe"
    if (Test-Path $mysqlPath) {
        Write-Status "MySQL CLI" "WARN" "$mysqlPath (not in PATH)"
    } else {
        Write-Status "MySQL CLI" "FAIL" "mysql.exe not found"
    }
} else {
    Write-Status "MySQL CLI" "OK" $mysqlPath
}

$tesseractPath = Test-CommandPath "tesseract"
if (-not $tesseractPath -and $env:TESSERACT_CMD) {
    if (Test-Path $env:TESSERACT_CMD) {
        $tesseractPath = $env:TESSERACT_CMD
    }
}
if (-not $tesseractPath) {
    foreach ($candidate in @(
        "C:\Program Files\Tesseract-OCR\tesseract.exe",
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    )) {
        if (Test-Path $candidate) {
            $tesseractPath = $candidate
            break
        }
    }
}
if ($tesseractPath) {
    Write-Status "Tesseract" "OK" $tesseractPath
} else {
    Write-Status "Tesseract" "FAIL" "Tesseract OCR not installed"
}

$dbVars = @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
$missingDbVars = @(
    $dbVars | Where-Object {
        -not [Environment]::GetEnvironmentVariable($_, "Process")
    }
)
if ($missingDbVars.Count -eq 0) {
    Write-Status "DB env" "OK" "$($env:DB_HOST):$($env:DB_PORT) / $($env:DB_NAME)"
} else {
    Write-Status "DB env" "WARN" "Missing: $($missingDbVars -join ', ')"
}

$dockerPath = Test-CommandPath "docker"
if ($dockerPath) {
    $dockerPing = docker ps --format "{{.Names}}" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Docker" "OK" $dockerPath
    } else {
        Write-Status "Docker" "WARN" "Docker CLI exists but daemon is unavailable"
    }
} else {
    Write-Status "Docker" "WARN" "docker not found"
}

if ($env:WEB_SEARCH_ENABLED -eq "true") {
    if ($env:WEB_SEARCH_ENDPOINT) {
        Write-Status "Web search" "OK" $env:WEB_SEARCH_ENDPOINT
    } else {
        Write-Status "Web search" "WARN" "Enabled but WEB_SEARCH_ENDPOINT is empty"
    }
} else {
    Write-Status "Web search" "WARN" "Disabled"
}
