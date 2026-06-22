# 一键把项目的 BOARD.md 推上看板(含"你当前在改哪块"的自动高亮)。
# 用法:
#   .\update.ps1                      # 默认同步 同级的 ..\weld_KAIERDA\BOARD.md 到线上
#   .\update.ps1 D:\path\BOARD.md     # 指定别的 BOARD.md
# 令牌从 weld-board\.env 的 BOARD_INGEST_TOKEN 自动读取。
param([string]$Board = "")
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here
if (-not $Board) { $Board = Join-Path (Split-Path $here -Parent) "weld_KAIERDA\BOARD.md" }
$env:BOARD_URL = "https://job-board-phi-sage.vercel.app"
npm run sync -- "$Board"
npm run sync:history -- "$Board"   # 历史车道:顺手把最近提交推上去(独立 endpoint/token,与实时高亮四不沾)
