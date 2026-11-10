!macro customInstall
  DetailPrint "Configuring Nocturne Studio Virtual Audio Subsystem..."
  ExecWait '"$INSTDIR\resources\driver\VBCABLE_Setup_x64.exe" -i -h'
  DetailPrint "Registering Nocturne Audio Endpoints..."
  ExecWait 'powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\resources\driver\register-endpoints.ps1"'
!macroend
