# AI 开发协作说明

本文档是本项目后续 AI 辅助开发时的操作约定。涉及新增产品、修改产品配置或调整打包流程时，应优先遵循本文档，并保持 `README.md` 与实际行为一致。

## 项目目标

这是一个基于 Tauri 的通用线上 URL → Windows EXE 打包器。每个产品使用独立的 JSON profile 描述，构建时由 profile 生成 Tauri 配置，并将线上 URL 封装为 Windows 安装程序。

## 新增产品时需要向用户确认的信息

如果用户只说“新增一个产品”但没有提供完整信息，应询问缺失项：

- 产品名称 `title`
- 产品 HTTPS 地址 `url`
- 产品 logo 图片路径；默认放在仓库根目录的 `img/`
- 稳定且唯一的小写反向域名标识符 `identifier`
- 版本 `version`；默认 `0.1.0`
- 目标架构 `target`；默认 `x64`
- 是否需要覆盖默认窗口配置 `window`

用户提供本地图片时，应确认图片已存在，再将其放入或引用到 `img/`。支持 `.png` 和 `.ico`。

## 新增产品标准流程

### 1. 准备图标

将图标放在：

```text
img/<product-file-name>.png
```

或：

```text
img/<product-file-name>.ico
```

profile 位于 `profiles/`，因此引用根目录 `img/` 下的图标时使用：

```json
"icon": "../img/<product-file-name>.png"
```

### 2. 创建 profile

文件名使用小写短横线格式，例如：

```text
profiles/new-product.json
```

标准模板：

```json
{
  "$schema": "../schemas/package-profile.schema.json",
  "title": "产品名称",
  "url": "https://example.com",
  "icon": "../img/new-product.png",
  "identifier": "com.example.new-product",
  "version": "0.1.0",
  "target": "x64"
}
```

约束：

- `url` 必须是 `https://` 地址
- `icon` 必须指向存在的 `.png` 或 `.ico` 文件
- `identifier` 必须符合小写反向域名格式，且产品之间不能重复
- 同一产品后续升级时不要修改 `identifier`
- 窗口通常使用 `config/package-defaults.json` 的默认值；只有确有需要时才添加 `window`

### 3. 同步维护 GitHub Actions 选项

当前工作流采用“推送后手动选择 profile 再构建”的模式。新增 profile 后，必须编辑：

```text
.github/workflows/build-windows-x64.yml
```

将新 profile 加入 `workflow_dispatch.inputs.profile.options`：

```yaml
options:
  - profiles/libtv.json
  - profiles/aimanju.json
  - profiles/new-product.json
```

不要把产品字段全部复制到 workflow 输入项中；产品字段以 JSON profile 为准。

### 4. 更新 README

如果新增产品改变了示例、操作步骤或可选 profile 列表，应同步更新：

```text
README.md
```

README 应明确说明：推送 `main` 只更新代码，不触发打包；需要在 GitHub Actions 中点击 **Run workflow**，选择 profile 和架构后才开始构建。

README 中必须保留以下实际操作路径：进入仓库 **Actions** → 点击左侧 **Build Windows x64 installer** → 在具体工作流页面点击右上角 **Run workflow** → 在弹出的配置框中选择 `main` 分支、profile 和 architecture → 点击配置框底部绿色 **Run workflow** 启动构建。要说明不要在 **All workflows** 总览页或历史运行详情页寻找配置按钮。

### 5. 本地校验与提交

至少检查：

- JSON 可以正常解析
- URL 为 HTTPS
- 图标文件存在且扩展名正确
- `identifier` 格式正确且唯一
- workflow 中存在新 profile 的选项
- `git diff --check` 无空白错误

推荐提交内容：

```text
git add profiles img .github/workflows/build-windows-x64.yml README.md
git commit -m "feat: add <product-name> packaging profile"
git push origin main
```

## GitHub Actions 当前行为

`.github/workflows/build-windows-x64.yml` 当前设计为：

- `push` 到 `main`：不触发 workflow
- `workflow_dispatch`：显示 profile 和 architecture 选项，选择后执行实际构建
- `profile`：从下拉框选择已登记的 JSON profile
- `architecture`：选择 `x64` 或 `x86`

这是因为 GitHub Actions 的 `push` 事件不能暂停等待用户输入。当前项目选择只保留手动启动，避免推送后产生无产物的误导性运行记录。

## 构建产物

构建成功后，在对应运行记录底部的 **Artifacts** 下载：

```text
url-exe-windows-x64-nsis
```

或 x86 对应产物。压缩包包含 Windows `.exe` 安装程序和 `SHA256SUMS.txt`。

## 自动化控制器与 AI 助手集成

项目提供两个 Node.js 入口：

- `npm run product -- list|validate|build|runs|status|download`：CLI，调用 GitHub Actions API
- `npm run agent-api`：仅监听 `127.0.0.1` 的 HTTP API，供 AI 助手适配器调用

控制器需要环境变量 `GITHUB_TOKEN`（或 `GH_TOKEN`）和 `GITHUB_REPOSITORY=owner/repository`。Token 只能通过部署环境注入，禁止写入源码、profile、README 或日志。

推荐的 AI 调用链：

```text
用户指令 → 收集/校验产品信息 → product add → git push → product build → runs/status → download
```

控制器可以调用 GitHub API，也可以直接启动本地 Tauri 构建。HTTP API 默认只绑定本机，不得直接暴露公网；部署到 `zqi-jianghe-a98e23b4` 时，应通过该实例的安全插件/适配器调用，或在反向代理层增加鉴权。

当前同时支持两套构建通道：

- `npm run product -- build-local --profile profiles/xxx.json --arch x64`：在 Windows 云电脑本地使用 Node.js、Rust、MSVC 和 Windows SDK 编译，直接生成 NSIS 安装包。
- `npm run product -- build-github --profile profiles/xxx.json --arch x64 --ref main`：调用 GitHub Actions，由 `windows-latest` Runner 编译并生成 Artifact。
- `npm run product -- doctor`：检查本地构建所需的 Node.js、npm、Rust 和 Cargo 是否可用。

AI 助手在云电脑上默认应优先使用 `build-local`；本地编译环境不可用时再使用 `build-github`。不得删除或替换 GitHub Actions 工作流。

新增产品可使用 `product add` 自动生成 profile、复制图标、更新 workflow 选项并选择性提交推送；手动编辑 JSON 时仍必须执行本文档既有校验流程。

## AI 执行原则

- 先检查现有 profile、图标和 workflow，再进行修改
- 新增产品不要修改或覆盖已有产品的 `identifier`
- 不要把生成的 `src-tauri/.generated/`、`src-tauri/target/` 或 `.codegraph/` 当作源码提交
- 不要为了新增产品重写整个打包脚本
- 修改 workflow 后必须检查手动输入项仍然存在，并确认 workflow 不会因 push 自动打包默认 profile
- 完成后向用户说明修改了哪些文件、如何提交，以及如何在 Actions 中选择并下载产物
