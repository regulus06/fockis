@echo off
cd /d "%~dp0"
(
git status --short -- web
echo === DIFF ===
git diff -- web/src/components/fockis/FockisSidebar
) > fockis-status-log.txt 2>&1
