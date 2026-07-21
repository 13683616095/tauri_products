# 通用线上 URL EXE 打包器

这是一个基于 Tauri 的通用线上 URL → Windows EXE 打包模板。每个产品通过独立的 `profile` 提供标题、HTTPS URL 和图标；“AI漫剧创作”仅作为示例 profile。

## 打包新产品（推荐：GitHub Actions）

### 1. 准备图标

将产品图标放入 `profiles/icons/`。支持 `.ico` 或 `.png`；PNG 会在构建前自动转换为 Windows ICO 图标。

### 2. 新建 profile

复制 `profiles/aimanju.json`，例如创建 `profiles/my-product.json`：

```json
{
  "$schema": "../schemas/package-profile.schema.json",
  "title": "我的产品",
  "url": "https://example.com/path?source=desktop",
  "icon": "icons/my-product.png",
  "identifier": "com.example.my-product",
  "version": "0.1.0",
  "target": "x64"
}
```

字段均为必填（`version` 和 `target` 有默认值）：

| 字段 | 规则 |
| --- | --- |
| `title` | 1–80 个字符；将成为 EXE、窗口和安装程序名称。 |
| `url` | 仅允许 `https://` 地址。 |
| `icon` | 相对 profile 文件的 `.png` 或 `.ico` 路径。 |
| `identifier` | 必填、稳定且唯一的小写反向域名，例如 `com.example.my-product`；升级同一产品时不要更改。 |
| `version` | 语义化版本，例如 `0.1.0`。 |
| `target` | `x64`（默认）或 `x86`。 |

### 2a. 窗口默认值与覆盖

所有 profile 默认使用 [package-defaults.json](config/package-defaults.json) 中的窗口配置：

```json
{
  "width": 1440,
  "height": 920,
  "minWidth": 1024,
  "minHeight": 680,
  "resizable": true,
  "fullscreen": true
}
```

无需在 profile 中重复填写。若某个产品需要不同窗口行为，可添加 `window` 并只覆盖需要改变的字段，例如以普通窗口启动：

```json
"window": {
  "fullscreen": false,
  "width": 1280,
  "height": 800
}
```

### 3. 推送 profile 和图标

```powershell
git add profiles
git commit -m "feat: add my-product packaging profile"
git push
```

### 4. 运行云端打包

打开 GitHub 仓库的 **Actions** → **Build Windows x64 installer** → **Run workflow**：

- **profile**：填写 `profiles/my-product.json`。
- **architecture**：默认选 `x64`；如需 32 位程序选 `x86`。
- 点击绿色的 **Run workflow**。

构建完成后，在运行记录底部下载 `url-exe-windows-x64-nsis`（或 `url-exe-windows-x86-nsis`）。其中包含安装程序和 `SHA256SUMS.txt` 校验文件；实际 EXE 文件名由 profile 的 `title`、`version` 和目标架构决定。

## 开发与打包

先安装 Rust stable（MSVC x64 目标）及 Visual Studio 的“使用 C++ 的桌面开发”工作负载（包含 Windows 10/11 SDK）。从 **x64 Native Tools Command Prompt for VS 2022** 打开项目目录后运行：

```powershell
npm install
npm run build
```

默认读取 `profiles/aimanju.json`。本地使用新 profile 或 32 位目标：

```powershell
$env:PACKAGE_PROFILE = "profiles/my-product.json"
$env:PACKAGE_ARCH = "x86" # 不设置时使用 profile 中的 target，默认 x64
npm run build
```

安装程序生成于（按选择的 Rust 目标）：

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

变更计划与验收规格见 `openspec/changes/generic-url-exe-packager/`。

## GitHub Actions 云端打包

本机缺少 Windows 原生编译环境时，可将项目推送至 GitHub 后在仓库的 **Actions** 页面运行 **Build Windows x64 installer** 工作流：

首次推送到新仓库时，在项目目录执行（将地址替换为你的仓库地址）：

```powershell
git init
git add .
git commit -m "build: add Windows x64 cloud packaging"
git branch -M main
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

1. 选择 **Run workflow**，填写 profile 和架构并确认运行。
2. 等待 Windows Runner 完成构建。
3. 在该运行记录底部的 **Artifacts** 下载 `url-exe-windows-x64-nsis`（或 x86 对应名称）。

产物包含 Windows x64 的 NSIS `.exe` 安装程序和 `SHA256SUMS.txt` 校验文件，保留 90 天。该工作流只在 GitHub 的 Windows Runner 中编译，不使用本机的 Visual Studio 或 PowerShell 环境。

若推送版本标签，工作流还会自动创建 GitHub Release 并上传同一份安装包：

```powershell
git tag v0.1.0
git push origin v0.1.0
```
