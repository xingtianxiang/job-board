# BOARD.md 生成 / 更新指令(工具无关:Claude · Codex · Cursor 都能用)

把这份文件丢进你的项目仓库根目录。要更新看板时,对你的 AI 说一句:
**“按 BOARD_PROMPT.md 扫描本项目,生成 / 增量更新根目录的 BOARD.md。”**
(同事各用各的 AI 都行,这是纯文本指令,不依赖某一个工具。)

---

## 你(AI)要做的

1. **若已有 BOARD.md,先读它** —— 这次是**增量更新**:只改有变化的部分,尽量保留原有 `key`、措辞与结构。
2. 读 `README`、`docs/` 下所有 `.md`、顶层目录结构、构建配置(`package.json` / `CMakeLists.txt` / `pyproject.toml` / `go.mod` 等),理解:
   - 有哪些**模块 / 子系统**、各自边界、相互依赖;
   - 统一的**技术路线**、已定的**关键技术决策**;
   - 当前 **待办 / 进行中 / 已完成** 的功能。
3. 按下面的格式写回根目录的 `BOARD.md`(顶部一对 `---` 之间是 YAML;`---` 以下正文随便写人类备注,网站不解析)。

## 几条要把握的

- 模块颗粒度对齐**产品功能 / 子系统**,不要按单个文件或类拆。
- **填 `paths` 能解锁“按 git 改动自动高亮”**:给每个模块写准它对应的代码路径 glob(如 `src/scene/**`)。
  之后任何人本地 `sync` 时,网站会看他当前分支改了哪些文件,命中某模块的 `paths` 就**自动把该模块高亮成他的颜色**(✎ 在改)——连标 `doing` 都不用。**强烈建议给每个模块都写好 `paths`。**
- **`doing` 是另一种高亮**:把某 feature 标 `status: doing` + 写 `owner`,对应模块也会高亮(▶ 进行中)。适合“还没动代码、但这是下一步要做的”。
- 只写**有证据**的内容;拿不准的 `owner` / `status` 就省略或标 `todo`,不要编。
- `key` 一旦定下**尽量别改**(改名 = 新模块,会丢它在看板上的位置)。
- 同一个项目每次都用**同一个 `slug`**(否则会变成另一个项目)。

## 格式(严格遵守字段名)

```yaml
---
project:
  name: <项目名>
  slug: <短横线小写唯一标识,如 weld-kaierda>
  techStack: |
    - <markdown 列统一技术栈 / 路线:语言、框架、构建、关键约定>
modules:
  - key: <稳定英文键,如 scene_widget>
    title: <模块名>
    owner: <负责人名字;不确定就省略>
    summary: <一句话职责>
    boundary: |
      <负责什么 / 明确不负责什么>
    dependsOn: [<依赖的其它模块 key>]
    paths: [<该模块对应的代码路径 glob,如 src/scene/**;可省略>]
    doc: |
      <较完整说明,markdown,可含小标题>
    functions:        # 可选,点到为止
      - name: <函数 / 接口签名>
        note: <一句话作用>
decisions:
  - title: <技术决策>
    status: accepted        # proposed | accepted | superseded
    module: <相关模块 key,可省>
    body: |
      <内容与理由>
features:
  - title: <功能>
    status: doing           # todo | doing | done(doing 会让对应模块在看板上高亮)
    module: <模块 key>
    owner: <负责人,可省>
---
```

## 写完后

- 把“这次改了哪些模块 / 功能 / 决策”列出来,以及你拿不准、需要人确认的点。
- 然后人用 `npm run sync` 把它画到看板上(见 weld-board 的 README)。
