---
version: alpha
name: weld-board · 工程红线
description: weld_KAIERDA 的工程红线约束清单。本文即可执行单一真源——redline 技能直接读每节的 `yaml redline` 围栏块来扫 diff;围栏块外的散文是给人读的镜像。增删红线只改本文、技能自动拾取;围栏块与散文冲突时以围栏块为准。
source: self
agents_ref: AGENTS.md
---

# weld-board · 工程红线

`/redline` 扫描的红线**单一真源**就是本文。每条红线 = 一个 `## Rn` 段:

- 段内的 ` ```yaml redline ` 围栏块 = **给机器读**的(技能只读这块:`detect` 拿去 grep、`severity` 拿去归级、`status` 决定查不查)。
- 围栏块外的 **为什么 / 合规改法** = 给人读的镜像。

## 怎么增 / 改 / 归档一条红线(只改本文,无需动技能)

- **增**:文末复制一个 `## Rn` 段,起一个没用过的 `id`(如 `R9`),填 `status: active`、`detect`、`scope`、`heuristic`、`compliant`,围栏块下写「为什么 / 合规改法」。保存即生效,`/redline` 下次自动拾取。
- **改**:就地编辑该段——调 `detect` 正则、改 `severity`、补 `heuristic`、润色散文。`id` 不动(它是身份键)。
- **归档(不删)**:把该段 `status: active` 改成 `archived`,整段保留;若被新规则取代,在新规则里填 `supersedes: <旧id>`,并给归档段标题加删除线(`## ~~R3 ...~~`)。技能跳过 `archived` 条目的扫描,但会在结尾按 `supersedes` 链列出,保留「为什么改过」。

> 手编辑约定:围栏块语言标 ` ```yaml redline `,字段照下方模板;`detect` 每条正则用单引号包(反斜杠按字面)。写坏的围栏块技能会报错中止(不会静默漏红线)。

## 等级

| 等级 | 含义 |
|---|---|
| **P0** ⛔ | 违反 AGENTS.md 硬红线,必须改才能 push |
| **P1** ⚠ | 强烈建议 push 前修 |
| **P2** ⚠ | 建议清理 |
| **P3** | 可后续处理 |

---

## R1 · 静默单位换算(mm/m、deg/rad)⛔

```yaml redline
id: R1
severity: P0
status: active
agents_ref: 'No silent mm/m conversions / No silent degree/radian conversions'
detect: ['\* ?1000', '/ ?1000(\.0)?', '\* ?0\.001', 'M_PI ?/ ?180', '/ ?180\.0', '\* ?3\.14159', 'deg2rad', 'rad2deg', '\* ?57\.29']
scope: src/
heuristic: 命中后还要判——换算附近无单位命名变量/常量(_mm/_m/_deg/_degrees/_rad 后缀)或就近注释标注输入输出单位,才算违规。
compliant: 换算落到带单位后缀的变量/常量,或就近注释标单位;角度走单一真源 common::degrees_to_radians / kPi,别各文件自写 M_PI/180。
supersedes: null
```

**为什么**:AGENTS.md 明文红线,本项目**最致命**的一条,静默违反后果最重。
**合规改法**:换算必须落到带单位后缀的变量/常量(`*_mm`/`*_deg`/`*_rad`)或就近注释;角度换算统一走 `common::degrees_to_radians` / `kPi`。

## R2 · 坐标系未命名 / 隐式坐标转换 ⛔

```yaml redline
id: R2
severity: P0
status: active
agents_ref: 'No hidden coordinate conversions / All coordinate frames must be named in code and docs / TCP must always be explicit'
detect: ['Eigen::Matrix4d', 'Affine3d', '\.inverse\(\) ?\*', 'TCP', 'tcp_']
scope: src/
heuristic: transform/位姿乘法的变量名、参数名或注释是否点明 from-frame→to-frame(如 T_base_workpiece);出现无帧名矩阵直接参与链式乘法,或硬编码 TCP 而非显式传入 → 标红。
compliant: 变量/参数/注释点明 from/to 帧名;TCP 显式传入,不得硬编码。
supersedes: null
```

**为什么**:AGENTS.md 要求所有坐标系在代码与文档里都命名、TCP 永远显式;隐式转换是本项目最致命红线之一。
**合规改法**:`T_base_workpiece` 这样把 from/to 帧名写进变量名或注释;TCP 作为参数显式传入。

## R3 · transform 数学重复实现(违反单一真源)⚠

```yaml redline
id: R3
severity: P1
status: active
agents_ref: 'deep-review 已把刚体逆/欧拉反解/角度换算收敛为单一真源'
detect: ['\.transpose\(\)', 'atan2\(.*\),\s*asin', 'constexpr double kPi', 'M_PI ?/ ?180']
scope: src/
heuristic: diff 里新出现本地手写刚体逆(R^T / -R^T t)、欧拉反解、或局部角度常量 → 应改为调用单一真源,新代码至少别再新增重复。
compliant: 刚体逆用 common::inverse_rigid_transform;笛卡尔位姿↔变换/欧拉反解用 execution_core::cart_point_from_transform;角度走 common::degrees_to_radians / kPi。
supersedes: null
```

**为什么**:deep-review 已把这些收敛为单一真源,重复实现会再次发散。角度单一真源标记为"待补"属已知欠债 [[deep-review-optimize-2026-06-09]],新代码至少别再新增重复。
**合规改法**:调用 `common::inverse_rigid_transform`(有带 from/to 帧名重载)、`execution_core::cart_point_from_transform`(已提升进 `weld_job_mapping.h`),而非各抄一份。

## R4 · 改了无关文件 ⚠

```yaml redline
id: R4
severity: P2
status: active
agents_ref: 'Do not refactor unrelated files'
detect: []
scope: '*'
heuristic: 对照本次任务意图核对 diff 文件清单,挑出与意图无关的改动(尤其纯格式化、重命名、跨模块连带改);疑似越界文件单列,请用户确认拆出。
compliant: 把越界改动拆成独立提交,或留到对应任务再改。
supersedes: null
```

**为什么**:AGENTS.md 明令不得顺手重构无关文件——越界改动会污染 diff、放大撞车面。
**合规改法**:本次只改与任务直接相关的文件;疑似越界的单列出来请用户确认。

## R5 · 接口/坐标逻辑改了却没更 docs ⚠

```yaml redline
id: R5
severity: P1
status: active
agents_ref: 'When changing any interface or coordinate logic, update docs/architecture/coordinate_systems.md 和 docs/specs/relevant_module_spec.md'
detect: ['include/.*\.h']
scope: src/
heuristic: 若 diff 触及公共头(include/**/*.h)签名、坐标/transform 逻辑或帧定义,检查同一改动是否同时动了 docs/architecture/coordinate_systems.md 与对应模块 spec;没有则标 P1 并指出该更新哪个 doc。
compliant: 同步更新 docs/architecture/coordinate_systems.md 与 docs/specs/<module>_spec.md。
supersedes: null
```

**为什么**:接口签名或坐标逻辑变了而 docs 不同步,会让下游照旧 docs 写出错代码。
**合规改法**:改公共头/坐标逻辑/帧定义的同一改动里,一并更新 `coordinate_systems.md` 与对应模块 spec。

## R6 · 新算法模块缺测试 ⚠

```yaml redline
id: R6
severity: P1
status: active
agents_ref: 'Every algorithmic module must include at least one smoke test or unit test / Done means tests or smoke checks exist'
detect: []
scope: src/
heuristic: 若在 src/<module> 新增算法性源文件/公共函数,检查 tests/ 下是否有对应新增/更新测试;没有则标缺测试(可接受临时 stub + TODO,但须显式存在)。
compliant: 加一个 smoke/unit test;或显式留 stub + TODO。
supersedes: null
```

**为什么**:AGENTS.md 把"有测试/冒烟检查"作为 Done 的定义,无测试的算法改动不算完成。
**合规改法**:每个算法模块至少一个 smoke 或 unit test;来不及就显式 stub + TODO。

## R7 · gRPC / Python 运行时回流到生产路径 ⛔

```yaml redline
id: R7
severity: P0
status: active
agents_ref: 'No Python or gRPC runtime in the production app path'
detect: ['Grpc', 'grpc::', '\.proto', 'GrpcRobotJobClient', 'camera_scan_pb2', 'import .*_pb2']
scope: src/
heuristic: src/(尤其 scan_adapter/app_shell)里新出现 gRPC / Python 运行时调用 → 标 P0。本分支已彻底删除 gRPC。
compliant: 走 in-process:ensure_inproc_backends() / inproc->robot_client()(见 [[codex-branch-port-gotchas]])。
supersedes: null
```

**为什么**:AGENTS.md non-goal 明确生产 app 路径禁止 gRPC/Python 运行时,本分支已彻底删除 gRPC,回流即破坏架构基线。
**合规改法**:用 in-process 后端(`ensure_inproc_backends()` / `inproc->robot_client()`)。

## R8 · 提交了运行时/敏感数据 ⛔

```yaml redline
id: R8
severity: P0
status: active
agents_ref: '运行时产物/凭据不得入库'
detect: ['config/scan_points\.json', '(^|/)artifacts/', '(^|/)build[^/]*/', 'token', 'password', 'secret', '\d{1,3}(\.\d{1,3}){3}']
scope: '*'
heuristic: 检查 staged/commit 是否带进运行时产物或凭据(config/scan_points.json 被实际数据覆盖、artifacts/、build*/、相机 SDK、密钥/IP/token);.gitignore 应覆盖的不得混入 commit。
compliant: 从 commit 移除并补 .gitignore;敏感值改走本地未入库配置。
supersedes: null
```

**为什么**:运行时产物/凭据入库属 P0 级硬红线,泄密且污染仓库历史。
**合规改法**:把这些路径从 commit 移除、补进 `.gitignore`;密钥/IP/token 走本地不入库的配置。
