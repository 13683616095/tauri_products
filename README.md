# 通用线上 URL EXE 打包器

这是一个基于 Tauri 的通用线上 URL → Windows EXE 打包模板。每个产品通过独立的 `profile` 提供标题、HTTPS URL 和图标；“AI漫剧创作”仅作为示例 profile。

## 打包新产品（推荐：GitHub Actions）

### 1. 准备图标

将产品图标放入仓库根目录的 `img/`。支持 `.ico` 或 `.png`；PNG 会在构建前自动转换为 Windows ICO 图标。

### 2. 新建 profile

复制 `profiles/aimanju.json`，例如创建 `profiles/my-product.json`：

```json
{
  "$schema": "../schemas/package-profile.schema.json",
  "title": "我的产品",
  "url": "https://example.com/path?source=desktop",
  "icon": "../img/my-product.png",
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
| `icon` | 相对 profile 文件的 `.png` 或 `.ico` 路径；当前默认放在仓库根目录的 `img/`。 |
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
  "fullscreen": false,
  "maximized": true
}
```

无需在 profile 中重复填写。默认会最大化启动，但保留标题栏、最小化/最大化/还原按钮；退出最大化后可按最小尺寸调整窗口。若某个产品需要不同窗口行为，可添加 `window` 并只覆盖需要改变的字段，例如以普通窗口启动：

```json
"window": {
  "maximized": false,
  "fullscreen": false,
  "width": 1280,
  "height": 800
}
```

### 3. 推送 profile 和图标

```powershell
git add profiles img .github/workflows/build-windows-x64.yml
git commit -m "feat: add my-product packaging profile"
git push
```

如果新增了产品，还需要在 `.github/workflows/build-windows-x64.yml` 的 `profile.options` 中增加该 profile 路径，例如：

```yaml
options:
  - profiles/libtv.json
  - profiles/aimanju.json
  - profiles/my-product.json
```

### 4. 运行云端打包

推送 `main` 分支只会更新代码，不会自动打包。打开 GitHub 仓库的 **Actions** → **Build Windows x64 installer** → **Run workflow**：

具体点击路径：

1. 进入 GitHub 仓库，点击顶部的 **Actions**。
2. 在左侧工作流列表中点击 **Build Windows x64 installer**。不要停留在 **All workflows** 总览页，也不要点击某一次历史运行记录。
3. 进入该工作流页面后，点击右上角的 **Run workflow**。
4. 在弹出的配置框中确认分支为 `main`。
5. 在 **profile** 下拉框中选择需要打包的产品。
6. 在 **architecture** 下拉框中选择 `x64` 或 `x86`。
7. 点击配置框底部绿色的 **Run workflow**，启动构建。

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

本机缺少 Windows 原生编译环境时，可将项目推送至 GitHub 后在仓库的 **Actions** 页面手动运行 **Build Windows x64 installer** 工作流：

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

当前工作流只通过 **workflow_dispatch** 手动启动，不会因推送 `main` 或版本标签自动构建。这样可以确保每次构建前都能明确选择 profile 和架构。

## AI/CLI 自动化能力

项目提供 `product` CLI，可由 AI 助手或其他自动化程序调用。它同时支持本地云电脑构建和 GitHub Actions 远程构建。

先设置环境变量：

```text
GITHUB_TOKEN=<具有 Actions 读写权限的 fine-grained token>
GITHUB_REPOSITORY=owner/repository
```

列出和校验产品：

```powershell
npm run product -- list
npm run product -- validate
```

触发指定 profile 的本地构建（默认）：

```powershell
npm run product -- build --profile profiles/libtv.json --arch x64
```

在 Windows 云电脑上直接本地构建：

```powershell
npm run product -- doctor
npm run product -- build-local --profile profiles/libtv.json --arch x64
```

也可以使用快捷命令：

```powershell
npm run doctor
npm run build-local -- --profile profiles/libtv.json --arch x64
npm run build-github -- --profile profiles/libtv.json --arch x64 --ref main
```

继续使用 GitHub Actions 构建：

```powershell
npm run product -- build-github --profile profiles/libtv.json --arch x64 --ref main
```

`build` 默认使用本地构建；需要明确选择时可使用 `--mode local` 或 `--mode github`。两套模式互不影响：本地模式直接生成 NSIS 安装包，GitHub 模式通过 Actions 生成 Artifact。

查询构建和下载产物：

```powershell
npm run product -- runs
npm run product -- status --run <RUN_ID>
npm run product -- download --run <RUN_ID> --name url-exe-windows-x64-nsis --out artifacts/libtv.zip
```

新增产品并自动维护 profile、图标和 workflow 选项：

```powershell
npm run product -- add --title "新产品" --url "https://example.com" --icon "img/new-product.png" --identifier "com.example.new-product" --push
```

`--push` 会提交并推送 `profiles/`、`img/` 和 workflow 文件；不带 `--push` 时只修改本地文件。

### AI 助手调用接口

还提供一个仅监听本机的 HTTP API：

```powershell
npm run agent-api
```

接口包括：

```text
GET  /health
GET  /profiles
POST /build?profile=profiles/libtv.json&arch=x64&ref=main
POST /build/local?profile=profiles/libtv.json&arch=x64
POST /build/github?profile=profiles/libtv.json&arch=x64&ref=main
GET  /runs
GET  /runs/<RUN_ID>
POST /runs/<RUN_ID>/download?name=url-exe-windows-x64-nsis&out=artifacts/libtv.zip
```

API 默认监听 `127.0.0.1:8787`，可通过 `PACKAGER_PORT` 修改端口。它没有内置远程鉴权，不应直接暴露到公网；部署到 AI 助手实例时，应使用实例自身的安全调用机制或在反向代理层增加认证。
