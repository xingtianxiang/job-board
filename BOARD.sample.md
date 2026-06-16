---
project:
  name: weld_KAIERDA
  slug: weld-kaierda
  techStack: |
    - **语言**:C++17,单进程终局(已去掉 gRPC / Python 回流)
    - **GUI**:Qt + VTK(scene_widget 负责渲染)
    - **构建**:CMake(VS 自带),离线依赖
    - **坐标**:所有坐标系必须命名,禁止静默单位换算

modules:
  - key: scene_widget
    title: 场景显示 SceneWidget
    owner: txing
    summary: VTK 渲染与三维交互,焊缝 / 工件 / 路径的可视化
    boundary: |
      只负责"显示与交互"。
      不做坐标变换、不碰设备 IO —— 需要变换时调用 transform 模块。
    dependsOn: [transform]
    doc: |
      ## 职责
      - 基于 VTK 的渲染管线:工件网格、焊缝、机器人路径
      - 鼠标交互:旋转 / 缩放 / 拾取
      ## 已知坑
      - VTK renderer 在窗口未就绪时的空指针守卫
    functions:
      - name: SceneWidget::render()
        note: 主渲染入口,每帧调用
      - name: SceneWidget::pick(x, y)
        note: 屏幕坐标拾取 → 返回工件实体

  - key: transform
    title: 坐标系与变换 Transform
    owner: txing
    summary: 各坐标系之间的命名变换(机器人基座 / 工件 / 相机 / TCP)
    boundary: |
      坐标变换的"单一真源"。任何坐标系转换都必须经过这里,禁止各模块自己手算。
    doc: |
      ## 命名坐标系
      base / workpiece / camera / tcp —— 一律显式命名,不允许裸 double。
    functions:
      - name: Transform::convert(from, to, p)
        note: 命名坐标系间转换;from / to 必须是已注册坐标系

  - key: camera
    title: 相机接入 Camera
    summary: 封装 camera_sdk,取点云 / 图像
    boundary: 只负责采集与标定输出;不做工艺判断。
    dependsOn: [transform]
    doc: |
      ## 来源
      复用现有 camera_sdk(同级目录)。

  - key: weld_core
    title: 焊接工艺 WeldCore
    summary: 焊缝识别、路径规划、工艺参数
    boundary: 业务核心;不直接碰 GUI,产出供 scene_widget 显示的数据。
    dependsOn: [transform, camera]

decisions:
  - title: 单进程 C++ 终局
    status: accepted
    module: scene_widget
    body: |
      放弃 gRPC + Python 的多进程方案,全部收敛到单进程 C++。
      理由:部署简单(可双击运行 exe)、调试链路短。robot-executor 已退场。
  - title: 坐标系必须命名,禁止静默单位换算
    status: accepted
    module: transform
    body: |
      所有坐标 / 位姿必须带坐标系名;mm / m 等单位换算必须显式,不允许"悄悄乘 1000"。
  - title: robot-executor 退场
    status: superseded
    body: 早期的独立执行进程已并入主进程,不再维护。

features:
  - title: 真机验证
    status: doing
    module: weld_core
    owner: txing
    body: 单进程终局已成,等真机联调。
  - title: 焊缝自动识别
    status: doing
    module: weld_core
  - title: 可双击运行的 exe 打包
    status: done
    module: scene_widget
  - title: 相机标定流程
    status: todo
    module: camera
---

# weld_KAIERDA 团队看板源文件(BOARD.md)

> 顶部一对 `---` 之间的 YAML 是给看板网站读的**结构化数据**;这条线以下随便写人类备注,网站不解析。
>
> **维护方式**:本地用 AI(Claude Code 等)先扫一遍项目 docs,把模块 / 边界 / 决策 / 功能补进上面的 YAML;
> 然后在 weld-board 目录运行 `npm run sync -- 这个文件的路径` 上传。**网站后端不调用 AI**,只做确定性解析。

## 字段速查
- `modules[].key`:稳定键。改名会被当成新模块(原来的位置 / 认领会丢)。
- `modules[].owner`:负责人名字;与网站里某人的名字一致时,该模块会高亮成他的色。
- `modules[].dependsOn`:依赖的模块 key 列表 → 画成箭头。
- `modules[].functions`:可选的函数级条目,显示在"模块单页"。
- `decisions[].status`:proposed | accepted | superseded。
- `features[].status`:todo | doing | done。
