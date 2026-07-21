# 桌面站点封装规范

## 需求：启动目标站点

应用 MUST 在创建主窗口时加载 `https://aimanjuzhizuo.com?ly=360`。

### 场景：用户启动已安装应用

- **当** 用户在 Windows x64 上启动“AI漫剧创作”
- **那么** 主窗口加载上述 HTTPS 地址
- **并且** URL 中仍包含 `ly=360`

## 需求：Windows x64 安装包

项目 MUST 能通过 Tauri 构建流程生成 Windows x64 的 NSIS 安装包。

### 场景：发布构建

- **当** 在具备 Rust MSVC x64 工具链的 Windows 环境运行 `npm run build`
- **那么** 构建完成且 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/` 包含安装程序

## 需求：云端 Windows x64 构建

项目 MUST 提供可手动触发的 GitHub Actions 工作流，在 GitHub 的 Windows Runner 上构建 NSIS 安装程序。

### 场景：手动获取安装包

- **当** 维护者在 GitHub Actions 手动运行构建工作流
- **那么** 运行记录上传 Windows x64 NSIS 安装程序与 `SHA256SUMS.txt` 作为可下载产物

### 场景：版本发布

- **当** 维护者推送名称匹配 `v*` 的 Git 标签
- **那么** 工作流创建对应 GitHub Release 并上传 Windows x64 安装程序和校验文件

## 需求：基本桌面窗口

应用 MUST 提供可调整大小的原生窗口，标题为“AI漫剧创作”。

### 场景：调整窗口

- **当** 用户拖动窗口边缘或使用最大化按钮
- **那么** 窗口响应原生 Windows 窗口操作
