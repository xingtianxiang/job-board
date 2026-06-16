# 自动同步看板(不需要仓库管理员)

你不是 weld_KAIERDA 仓库的管理员,所以不用 GitHub Action;改成**在你自己电脑上自动跑 sync**。三选一,推荐定时任务。

> 前提:weld-board 已 `npm install`,且 `weld-board\.env` 里 `BOARD_INGEST_TOKEN=kaierda`(与线上一致)。
> 核心脚本 [`update.ps1`](./update.ps1) 已封装好(默认同步同级 `..\weld_KAIERDA\BOARD.md` 到线上)。

## 方式 1:手动(最简单)
```powershell
cd "C:\Users\txing\wild robot\weld-board"
.\update.ps1
```
改了代码想刷新看板时跑一下即可。

## 方式 2:Windows 定时任务(推荐,真·零维护)
每 10 分钟自动把"你当前(含未提交)在改哪块"推上看板。**注册一次**:
```powershell
$script = "C:\Users\txing\wild robot\weld-board\update.ps1"   # 换成你的实际路径
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName "weld-board-sync" -Action $action -Trigger $trigger -Description "每10分钟把 BOARD.md 推上看板"
```
- 查看:`Get-ScheduledTask -TaskName weld-board-sync`
- 立刻跑一次:`Start-ScheduledTask -TaskName weld-board-sync`
- **取消**:`Unregister-ScheduledTask -TaskName weld-board-sync -Confirm:$false`

## 方式 3:git 钩子(commit 时触发)
在 **weld_KAIERDA** 仓库里建 `.git/hooks/post-commit`(无扩展名),内容:
```sh
#!/bin/sh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:/Users/txing/wild robot/weld-board/update.ps1" >/dev/null 2>&1 &
```
本地钩子,不入库、不需管理员、不影响别人。缺点:只在 commit 时触发,不如定时任务能捕捉"还没提交"的实时状态。

---

**说明**:`update.ps1` 会读你当前分支的改动(优先未提交的),命中哪个模块的 `paths` 就把该模块在看板上标成 `✎ 在改`(你的色)。同一模块多人在改时,看板会标 `⚠ N 人在改` 提醒撞车。
如果高亮显示成兜底橙而不是你的色,说明你的看板成员名和 `git config user.name` 不一致,改成一致即可。

**多人协作约定**:**结构求同、高亮存异**——模块划分(BOARD.md 的结构)以 **main 上的为准**,大家 pull 同步、改结构先对齐;而"谁在改哪块"(高亮)按各自分支/本地独立,互不覆盖。看到 `⚠ N 人在改` 就是提醒你们俩动到同一块了,去对一下边界。
