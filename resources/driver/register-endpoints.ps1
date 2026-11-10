# Rename audio endpoint friendly names in Windows Audio Subsystem to Nocturne Studio Line & Mic
try {
    # 1. Output/Playback (Render): Nocturne Audio Line
    Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Render' -ErrorAction SilentlyContinue | ForEach-Object {
        $p = Join-Path $_.PSPath 'Properties'
        if (Test-Path $p) {
            $v2 = (Get-ItemProperty $p).'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
            $v6 = (Get-ItemProperty $p).'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
            if (($v2 -and ($v2 -like '*CABLE Input*' -or $v2 -like '*Nocturne*')) -or ($v6 -and $v6 -like '*VB-Audio*')) {
                # Line 1 in Discord/Apps: Device Brand
                Set-ItemProperty -Path $p -Name '{b3f8fa53-0004-438e-9003-51a46e139bfc},6' -Value 'Nocturne Studio' -Force
                # Line 2 in Discord/Apps: Friendly Name
                Set-ItemProperty -Path $p -Name '{a45c254e-df1c-4efd-8020-67d146a850e0},2' -Value 'Nocturne Audio Line' -Force
            }
        }
    }

    # 2. Input/Microphone (Capture): Nocturne Studio Mic
    Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture' -ErrorAction SilentlyContinue | ForEach-Object {
        $p = Join-Path $_.PSPath 'Properties'
        if (Test-Path $p) {
            $v2 = (Get-ItemProperty $p).'{a45c254e-df1c-4efd-8020-67d146a850e0},2'
            $v6 = (Get-ItemProperty $p).'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
            if (($v2 -and ($v2 -like '*CABLE Output*' -or $v2 -like '*Nocturne*')) -or ($v6 -and $v6 -like '*VB-Audio*')) {
                # Line 1 in Discord/Apps: Device Brand
                Set-ItemProperty -Path $p -Name '{b3f8fa53-0004-438e-9003-51a46e139bfc},6' -Value 'Nocturne Studio' -Force
                # Line 2 in Discord/Apps: Friendly Name
                Set-ItemProperty -Path $p -Name '{a45c254e-df1c-4efd-8020-67d146a850e0},2' -Value 'Nocturne Studio Mic' -Force
            }
        }
    }

    # Refresh Windows Audio Service to update Discord, FiveM, and Windows Sound Panel immediately
    Restart-Service Audiosrv -Force -ErrorAction SilentlyContinue
} catch {}
