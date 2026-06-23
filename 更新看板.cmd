@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo  Update weld board  =  sync BOARD.md to the website
echo  Dev server must be running first (run the other .cmd).
echo ============================================================
echo.
call npm run sync -- "..\weld_KAIERDA\BOARD.md"
echo.
echo ------------------------------------------------------------
echo  Finished. Look for the success line above.
echo ------------------------------------------------------------
pause
