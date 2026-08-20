@echo off
cd /d C:\Users\tong3\.gemini\antigravity\scratch\karaoke-sync-player
bin\git\cmd\git.exe reset
bin\git\cmd\git.exe add -A
bin\git\cmd\git.exe commit -m "Deploy 24/7 backend"
bin\git\cmd\git.exe branch -M main
bin\git\cmd\git.exe remote remove origin
bin\git\cmd\git.exe remote add origin https://github.com/Sukky334576/nocturne-karaoke-backend.git
bin\git\cmd\git.exe log -n 1
