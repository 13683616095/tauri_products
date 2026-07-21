# 设计

## 架构

使用 Tauri 2 的 Rust 入口创建一个外部 URL 的 `WebviewWindow`。应用自身不承载站点页面；`dist/index.html` 只满足 Tauri 构建时对前端产物的要求，不会作为主窗口内容。

## 关键决策

- **固定外部 URL**：减少配置漂移，并确保渠道参数 `ly=360` 不会丢失。
- **产品 Logo**：使用用户提供的 `img/AI漫剧创作logo.png` 生成 Windows 所需图标，供窗口、快捷方式和安装程序复用。
- **NSIS**：生成单文件、面向终端用户的 Windows 安装体验。
- **x64 工具链**：Windows 机器上的 Tauri 默认随 Rust `x86_64-pc-windows-msvc` 目标构建，避免生成 32 位程序。

## 安全与行为边界

- 该壳仅请求用户指定的 HTTPS 地址。
- 不嵌入站点凭据、Cookie、API 密钥或第三方脚本。
- 目标网站不能访问时，WebView 显示其正常的网络错误页面。

## 打包前置条件

- Rust stable（`x86_64-pc-windows-msvc`）和 MSVC C++ Build Tools。
- Node.js 20+ 与 npm。
- 允许 npm/Cargo 下载 Tauri 依赖及 NSIS 打包所需组件。

## 云端构建备用方案

当本机 Windows C++ 工具链受策略限制时，GitHub Actions 的 `windows-latest` Runner 作为等价构建环境。工作流使用项目锁定的 npm 依赖，执行同一条 `npm run build` 命令，生成 SHA-256 校验文件，并将 NSIS `.exe` 作为运行产物保留 90 天。推送 `v*` 版本标签时，工作流自动创建 GitHub Release。
