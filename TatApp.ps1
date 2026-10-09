$ErrorActionPreference = 'Continue'
$closedWindows = 0
$failed = $false

# Close only visible app windows whose page title identifies the POS app.
$windows = @(Get-Process -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like '*POS App*'
})
foreach ($window in $windows) {
    if ($window.CloseMainWindow()) {
        $closedWindows++
    }
}
if ($closedWindows -gt 0) {
    Write-Output "Closed $closedWindows POS app window(s)."
} else {
    Write-Output 'No POS app window was found.'
}

Start-Sleep -Milliseconds 800

# Read the listener PID with netstat so the script works without admin rights.
$netstat = & "$env:SystemRoot\System32\netstat.exe" -ano -p tcp 2>$null
$owners = @($netstat | ForEach-Object {
    if ($_ -match '^\s*TCP\s+\S+:5000\s+\S+\s+LISTENING\s+(\d+)\s*$') {
        [int]$matches[1]
    }
} | Sort-Object -Unique)

if ($owners.Count -eq 0) {
    Write-Output 'The POS server is already stopped or is not running.'
} else {
    foreach ($owner in $owners) {
        $processInfo = Get-Process -Id $owner -ErrorAction SilentlyContinue
        if ($processInfo -and $processInfo.ProcessName -eq 'node') {
            try {
                Stop-Process -Id $owner -Force -ErrorAction Stop
                Write-Output "Stopped POS server process $owner."
            } catch {
                Write-Output "Could not stop POS server process ${owner}: $($_.Exception.Message)"
                $failed = $true
            }
        } else {
            Write-Output "Port 5000 is not owned by a Node.js server (PID $owner); it was left running."
            $failed = $true
        }
    }
}

if ($failed) { exit 1 }
exit 0
