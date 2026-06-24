@echo off
setlocal

cd /d "%~dp0"

set "COMMIT_MESSAGE=%~1"
if not defined COMMIT_MESSAGE set "COMMIT_MESSAGE=update UI + wallet fix"

echo.
echo Current Git status:
git status
if errorlevel 1 goto :failed

echo.
set /p "CONFIRM=Stage, commit, and push these changes? [y/N]: "
if /i not "%CONFIRM%"=="y" (
  echo Publish cancelled.
  exit /b 0
)

git add .
if errorlevel 1 goto :failed

git diff --cached --quiet
if not errorlevel 1 (
  echo No changes to commit.
  exit /b 0
)

git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto :failed

git push
if errorlevel 1 goto :failed

echo.
echo Changes pushed successfully.
exit /b 0

:failed
echo.
echo Git publish failed. Review the error above.
exit /b 1
