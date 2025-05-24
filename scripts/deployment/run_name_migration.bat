@echo off
echo Sales Training AI - Name Diversity Migration
echo =========================================
echo.
echo Running name diversity migration...
python migrations/create_name_usage_tracker.py
echo.
echo Migration complete!
echo.
echo Press any key to exit...
pause > nul 