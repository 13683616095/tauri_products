import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const architectureTargets = {
  x64: "x86_64-pc-windows-msvc",
  x86: "i686-pc-windows-msvc"
};

function fail(message) {
  throw new Error(`无效的打包配置：${message}`);
}

function loadWindowSettings(value) {
  const defaultsPath = resolve(root, "config", "package-defaults.json");
  const defaults = JSON.parse(readFileSync(defaultsPath, "utf8")).window;
  if (!defaults || typeof defaults !== "object") fail("项目默认窗口配置无效");
  if (value !== undefined && (!value || typeof value !== "object" || Array.isArray(value))) {
    fail("window 必须是对象");
  }

  const window = { ...defaults, ...(value ?? {}) };
  for (const field of ["width", "height", "minWidth", "minHeight"]) {
    if (typeof window[field] !== "number" || window[field] <= 0) fail(`window.${field} 必须为正数`);
  }
  for (const field of ["resizable", "fullscreen", "maximized"]) {
    if (typeof window[field] !== "boolean") fail(`window.${field} 必须为布尔值`);
  }
  return window;
}

function loadProfile(profilePath) {
  if (!existsSync(profilePath)) fail(`找不到 profile：${profilePath}`);

  let profile;
  try {
    profile = JSON.parse(readFileSync(profilePath, "utf8"));
  } catch {
    fail("profile 不是有效的 JSON 文件");
  }

  if (!profile || typeof profile !== "object" || Array.isArray(profile)) fail("profile 必须是对象");
  if (typeof profile.title !== "string" || !profile.title.trim() || profile.title.length > 80) {
    fail("title 必须为 1–80 个字符");
  }
  if (typeof profile.url !== "string") fail("url 必须是 HTTPS 地址");

  let parsedUrl;
  try {
    parsedUrl = new URL(profile.url);
  } catch {
    fail("url 必须是有效的 HTTPS 地址");
  }
  if (parsedUrl.protocol !== "https:") fail("url 仅支持 HTTPS");

  if (typeof profile.icon !== "string") fail("icon 为必填项");
  const iconPath = isAbsolute(profile.icon)
    ? profile.icon
    : resolve(dirname(profilePath), profile.icon);
  const iconExtension = extname(iconPath).toLowerCase();
  if (!existsSync(iconPath) || ![".ico", ".png"].includes(iconExtension)) {
    fail("icon 必须指向存在的 .ico 或 .png 文件");
  }

  if (typeof profile.identifier !== "string" || !/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(profile.identifier)) {
    fail("identifier 必须为小写反向域名格式，例如 com.example.my-product");
  }

  const target = process.env.PACKAGE_ARCH ?? profile.target ?? "x64";
  if (!(target in architectureTargets)) fail("target 仅支持 x64 或 x86");

  const version = profile.version ?? "0.1.0";
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
    fail("version 必须是语义化版本，例如 0.1.0");
  }

  return {
    title: profile.title.trim(),
    url: profile.url,
    identifier: profile.identifier,
    iconPath,
    iconExtension,
    target,
    rustTarget: architectureTargets[target],
    version,
    window: loadWindowSettings(profile.window)
  };
}

function prepareIcon(profile) {
  const iconDirectory = resolve(root, "src-tauri", "icons");
  mkdirSync(iconDirectory, { recursive: true });
  const destination = resolve(iconDirectory, "icon.ico");

  if (resolve(profile.iconPath) === destination) return;
  if (profile.iconExtension === ".ico") {
    copyFileSync(profile.iconPath, destination);
    return;
  }

  const tauriCli = resolve(root, "node_modules", "@tauri-apps", "cli", "tauri.js");
  execFileSync(process.execPath, [tauriCli, "icon", profile.iconPath, "--output", iconDirectory], {
    cwd: root,
    stdio: "inherit"
  });
  if (!existsSync(destination)) fail("无法从 PNG 生成 Windows ICO 图标");
}

export function preparePackage() {
  const profileInput = process.env.PACKAGE_PROFILE ?? "profiles/aimanju.json";
  const profilePath = isAbsolute(profileInput) ? profileInput : resolve(root, profileInput);
  const profile = loadProfile(profilePath);
  prepareIcon(profile);

  const generatedConfigDirectory = resolve(root, "src-tauri", ".generated");
  mkdirSync(generatedConfigDirectory, { recursive: true });
  writeFileSync(
    resolve(generatedConfigDirectory, "tauri.profile.conf.json"),
    `${JSON.stringify({
      productName: profile.title,
      version: profile.version,
      identifier: profile.identifier,
      app: {
        windows: [{
          label: "main",
          title: profile.title,
          url: profile.url,
          ...profile.window
        }]
      },
      bundle: { icon: ["icons/icon.ico"] }
    }, null, 2)}\n`,
    "utf8"
  );

  return profile;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const profile = preparePackage();
  console.log(`已准备 ${profile.title}：${profile.target} (${profile.rustTarget})`);
}
