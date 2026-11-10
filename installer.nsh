!macro customInstall
  DetailPrint "Configuring Nocturne Studio Virtual Audio Subsystem..."
  ExecWait '"$INSTDIR\resources\driver\VBCABLE_Setup_x64.exe" -i -h'
!macroend
