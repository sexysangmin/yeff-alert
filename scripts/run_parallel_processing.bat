@echo off
echo ==========================================
echo  YEFF ALERT 3구간 병렬 처리 시작
echo ==========================================
echo.
echo 구간 1: 901-1700 실패분 재처리 (이미 진행됨)
echo 구간 2: 1701-2634 신규 처리 (934개)
echo 구간 3: 2635-3568 신규 처리 (934개)
echo.
echo 예상 완료 시간: 20-25분
echo.

REM 3개의 새로운 명령 프롬프트 창에서 병렬 실행
start "Section 1 - Range Reprocess" cmd /k "cd /d %~dp0.. && node scripts/reprocess_range_failed.js"
start "Section 2 - 1701-2634" cmd /k "cd /d %~dp0.. && node scripts/process_section2_1701_2634.js"
start "Section 3 - 2635-3568" cmd /k "cd /d %~dp0.. && node scripts/process_section3_2635_3568.js"

echo.
echo ✅ 3개 구간 처리 시작됨!
echo.
echo 💡 모든 구간 완료 후 다음 명령어로 병합:
echo    node scripts/merge_all_sections.js
echo.
pause 