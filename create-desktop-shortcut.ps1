$targetExe = 'C:\Users\tong3\.gemini\antigravity\scratch\karaoke-sync-player\dist\win-unpacked\Nocturne Studio.exe'
$workDir = 'C:\Users\tong3\.gemini\antigravity\scratch\karaoke-sync-player\dist\win-unpacked'
$iconPath = 'C:\Users\tong3\.gemini\antigravity\scratch\karaoke-sync-player\resources\icon.ico'

$wsh = New-Object -ComObject WScript.Shell

$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    'C:\Users\tong3\Desktop',
    'C:\Users\tong3\OneDrive\Desktop'
) | Select-Object -Unique

foreach ($d in $desktopPaths) {
    if (Test-Path $d) {
        $shortcutFile = Join-Path $d 'Nocturne Studio.lnk'
        $sc = $wsh.CreateShortcut($shortcutFile)
        $sc.TargetPath = $targetExe
        $sc.WorkingDirectory = $workDir
        $sc.IconLocation = "$iconPath,0"
        $sc.Description = 'Nocturne Studio - Precision Karaoke & Vocal Engine'
        $sc.Save()
        Write-Host "Created shortcut successfully at: $shortcutFile"
    }
}

# Flush Windows Explorer icon cache and trigger immediate desktop redraw
try {
    Start-Process -FilePath "ie4uinit.exe" -ArgumentList "-show" -Wait -ErrorAction SilentlyContinue
    python -c "import ctypes; ctypes.windll.shell32.SHChangeNotify(0x08000000, 0, None, None)"
    Write-Host "Windows Explorer icon cache flushed and refreshed successfully!"
} catch {
    Write-Host "Note: Shell notification fallback triggered."
}
