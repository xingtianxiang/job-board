# 模块详情页视觉核验

- Source visual truth: `C:\Users\txing\AppData\Local\Temp\codex-clipboard-4bfac58a-8797-4159-817b-041192cc8b68.png`
- Implementation screenshot: in-app browser capture of `http://localhost:3000/module/trajectory`
- Viewport: desktop, 1115 × 912
- State: `trajectory` 模块；3 条已完成功能、无接口函数记录、无技术决策。

## Full-view comparison evidence

参考图与本地页面截图在同一轮视觉对照中检查。两者都采用宽屏双栏、上方身份/约束分区、左侧工艺与功能信息、右侧依赖与技术信息的层级。

## Focused region comparison

已核对顶部身份区、黄色约束区、工艺流程卡片、功能状态表与依赖表。小字与表格线在截图中清晰可读，不需要额外局部截图。

## Findings

无可执行的 P0/P1/P2 问题。

- [P3] 参考图中的功能说明、接口数据与技术决策比当前模块数据更完整。
  - Evidence: 当前 `trajectory` 数据没有功能说明、函数记录或技术决策。
  - Resolution: 保留三列表头与接口区，并以真实的“—”及空状态呈现；未伪造版本、接口或决策数据。

## Required fidelity surfaces

- Fonts and typography: 使用现有系统无衬线字体与等宽模块键；标题、区块标题、表头、正文层级清楚。
- Spacing and layout rhythm: 1440px 宽内容框、两栏网格、细分隔线与紧凑表格节奏匹配参考图。
- Colors and visual tokens: 白底、浅灰表格线、淡黄色边界提示、蓝色当前模块描边与绿色完成状态均与参考方向一致。
- Image quality and asset fidelity: 参考页没有需复刻的图像资产；实现未添加替代性装饰图形。
- Copy and content: 所有模块名、边界、依赖与状态来自当前数据；缺失信息显示为空状态。

## Patches made since the previous QA pass

- 增加“参考总览”页签，补齐参考图的顶部导航节奏。
- 将功能区改为“功能项 / 说明 / 状态”三列表。
- 让接口与函数区始终可见，并在无数据时明确显示空状态。
- 将无技术决策状态收敛为轻量文本，避免无来源的装饰性卡片。

## Implementation checklist

- [x] 双栏技术总览布局
- [x] 工艺流程位置及上下游链接
- [x] 功能、接口、依赖与技术决策的真实数据/空状态
- [x] TypeScript 检查与浏览器渲染核验

## Follow-up polish

- 当同步数据补齐 `Feature.body`、模块 `functions` 和技术决策后，三列表与右栏会自动获得参考图中的信息密度。

final result: passed
