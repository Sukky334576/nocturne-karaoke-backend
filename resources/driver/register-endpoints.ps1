# Rename audio endpoint friendly names in Windows Audio Subsystem to Nocturne Studio Line & Mic
try {
    Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render' -ErrorAction SilentlyContinue | ForEach-Object {
        $p = Join-Path $_.PSPath 'Properties'
        if (Test-Path $p) {
            $v = (Get-ItemProperty $p).'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
            if ($v -and ($v -like '*CABLE Input*' -or $v -like '*Nocturne Audio Line*')) {
                Set-ItemProperty -Path $p -Name '{a45c254e-df1c-4efd-8020-67d146a850e0},2' -Value 'Nocturne Audio Line (CABLE Input)' -Force
            }
        }
    }
    Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture' -ErrorAction SilentlyContinue | ForEach-Object {
        $p = Join-Path $_.PSPath 'Properties'
        if (Test-Path $p) {
            $v = (Get-ItemProperty $p).'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
            if ($v -and ($v -like '*CABLE Output*' -or $v -like '*Nocturne Studio Mic*')) {
                Set-ItemProperty -Path $p -Name '{a45c254e-df1c-4efd-8020-67d146a850e0},2' -Value 'Nocturne Studio Mic (CABLE Output)' -Force
            }
        }
    }
    # Refresh Windows Audio Service to update all running apps immediately
    Restart-Service Audiosrv -Force -ErrorAction SilentlyContinue
} catch {}
