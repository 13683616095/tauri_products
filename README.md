# AI漫剧创作桌面版

这是 `https://aimanjuzhizuo.com?ly=360` 的 Windows Tauri 桌面封装。产品名称为“AI漫剧创作”，图标来源为 `img/AI漫剧创作logo.png`。

## 开发与打包

先安装 Rust stable（MSVC x64 目标）及 Visual Studio 的“使用 C++ 的桌面开发”工作负载（包含 Windows 10/11 SDK）。从 **x64 Native Tools Command Prompt for VS 2022** 打开项目目录后运行：

```powershell
npm install
npm run build
```

安装程序生成于：

```text
src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
```

变更计划与验收规格见 `openspec/changes/package-aimanju-tauri/`。

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

1. 选择 **Run workflow** 并确认运行。
2. 等待 Windows Runner 完成构建。
3. 在该运行记录底部的 **Artifacts** 下载 `AI漫剧创作-windows-x64-nsis`。

产物包含 Windows x64 的 NSIS `.exe` 安装程序和 `SHA256SUMS.txt` 校验文件，保留 90 天。该工作流只在 GitHub 的 Windows Runner 中编译，不使用本机的 Visual Studio 或 PowerShell 环境。

若推送版本标签，工作流还会自动创建 GitHub Release 并上传同一份安装包：

```powershell
git tag v0.1.0
git push origin v0.1.0
```
