@echo off
cd /d "%~dp0"
(
git add -- "web/src/components/fockis/FockisSidebar/sidebar/SidebarMainSection.tsx"
git add -- "web/src/features/admin/store/adminSessionStore.ts"
git commit -m "Admin: show the Admin Dashboard link to every real Super Admin" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01A3szchJnCeJBFMCiJpa3ev"
git push
git log --oneline -2
echo === DONE ===
) > fockis-push-log.txt 2>&1
