#!/usr/bin/env node

import { copyFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflow = "build-windows-x64.yml";

function fail(message) {
  throw new Error(message);
}

function argsOf(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    result[key] = argv[i + 1]?.startsWith("--") ? true : (argv[i + 1] ?? true);
    if (result[key] !== true) i += 1;
  }
  return result;
}

function required(value, name) {
  if (!value) fail(`缺少 ${name}`);
  return value;
}

function config(options) {
  const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repository = options.repo || process.env.GITHUB_REPOSITORY;
  if (!token) fail("请设置 GITHUB_TOKEN 或 GH_TOKEN");
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    fail("请设置 GITHUB_REPOSITORY，格式为 owner/repository");
  }
  return { token, repository };
}

async function github(path, options, init = {}) {
  const { token, repository } = config(options);
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    fail(`GitHub API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response;
}

function profileFiles() {
  const directory = resolve(root, "profiles");
  if (!existsSync(directory)) return [];
  return execFileSync(process.platform === "win32" ? "cmd.exe" : "sh",
    process.platform === "win32" ? ["/d", "/s", "/c", "dir /b profiles\\*.json"] : ["-c", "find profiles -maxdepth 1 -name '*.json' -printf '%f\\n'"],
    { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).map((name) => `profiles/${name}`);
}

function parseJsonProfile(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) fail(`找不到 profile：${file}`);
  try {
    return { path, data: JSON.parse(readFileSync(path, "utf8")) };
  } catch {
    fail(`profile 不是有效 JSON：${file}`);
  }
}

function validateProfile(file) {
  const { data } = parseJsonProfile(file);
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(`profile 必须是对象：${file}`);
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 80) fail(`title 无效：${file}`);
  let url;
  try { url = new URL(data.url); } catch { fail(`url 无效：${file}`); }
  if (url.protocol !== "https:") fail(`url 必须使用 HTTPS：${file}`);
  const icon = resolve(dirname(resolve(root, file)), data.icon);
  if (!existsSync(icon) || ![".png", ".ico"].includes(icon.slice(icon.lastIndexOf(".")).toLowerCase())) fail(`icon 不存在或格式无效：${file}`);
  if (typeof data.identifier !== "string" || !/^[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+$/.test(data.identifier)) fail(`identifier 无效：${file}`);
  return data;
}

async function list(options) {
  const files = profileFiles().map((file) => {
    const data = validateProfile(file);
    return { file, title: data.title, url: data.url, version: data.version ?? "0.1.0" };
  });
  console.log(JSON.stringify(files, null, 2));
}

async function validate(options) {
  const files = options.profile ? [options.profile] : profileFiles();
  files.forEach((file) => validateProfile(file));
  console.log(JSON.stringify({ valid: true, profiles: files }, null, 2));
}

function slug(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function addWorkflowOption(file) {
  const workflowPath = resolve(root, ".github", "workflows", workflow);
  let content = readFileSync(workflowPath, "utf8");
  if (content.split(/\r?\n/).some((line) => line.trim() === `- ${file}`)) return;
  const marker = "          - profiles/aimanju.json";
  if (!content.includes(marker)) fail("无法定位 workflow 的 profile.options，请手动添加 profile");
  content = content.replace(marker, `${marker}\n          - ${file}`);
  writeFileSync(workflowPath, content, "utf8");
}

async function add(options) {
  const title = required(options.title, "--title");
  const url = required(options.url, "--url");
  const iconSource = required(options.icon, "--icon");
  const identifier = required(options.identifier, "--identifier");
  const fileName = options.file || `${slug(title)}.json`;
  const profile = `profiles/${fileName}`;
  const destination = resolve(root, "img", basename(iconSource));
  mkdirSync(resolve(root, "img"), { recursive: true });
  if (!existsSync(resolve(root, iconSource)) && !existsSync(iconSource)) fail(`找不到图标：${iconSource}`);
  const source = existsSync(resolve(root, iconSource)) ? resolve(root, iconSource) : resolve(iconSource);
  if (source !== destination) copyFileSync(source, destination);
  const icon = `../img/${basename(iconSource)}`;
  writeFileSync(resolve(root, profile), `${JSON.stringify({
    "$schema": "../schemas/package-profile.schema.json", title, url, icon, identifier,
    version: options.version || "0.1.0", target: options.arch || "x64",
    ...(options.window ? { window: JSON.parse(options.window) } : {})
  }, null, 2)}\n`, "utf8");
  addWorkflowOption(profile);
  validateProfile(profile);
  if (options.push) {
    execFileSync("git", ["add", profile, `img/${basename(iconSource)}`, ".github/workflows/build-windows-x64.yml"], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["commit", "-m", `feat: add ${title} packaging profile`], { cwd: root, stdio: "inherit" });
    execFileSync("git", ["push", "origin", "main"], { cwd: root, stdio: "inherit" });
  }
  console.log(JSON.stringify({ created: true, profile, icon: `img/${basename(iconSource)}`, pushed: Boolean(options.push) }, null, 2));
}

async function build(options) {
  const profile = required(options.profile, "--profile");
  const architecture = options.arch || "x64";
  if (!["x64", "x86"].includes(architecture)) fail("--arch 只能是 x64 或 x86");
  validateProfile(profile);
  if (options.mode === "local") return buildLocal({ ...options, profile, architecture });
  return buildGithub({ ...options, profile, architecture });
}

function runLocalBuild(profile, architecture) {
  return new Promise((resolvePromise, reject) => {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const child = spawn(command, ["run", "build"], {
      cwd: root,
      env: { ...process.env, PACKAGE_PROFILE: profile, PACKAGE_ARCH: architecture },
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`本地构建失败，退出码：${code}`)));
  });
}

async function buildLocal({ profile, architecture }) {
  if (process.platform !== "win32") fail("本地 Tauri Windows 构建必须在 Windows 云电脑上运行");
  validateProfile(profile);
  await runLocalBuild(profile, architecture);
  const rustTarget = architecture === "x86" ? "i686-pc-windows-msvc" : "x86_64-pc-windows-msvc";
  const output = resolve(root, "src-tauri", "target", rustTarget, "release", "bundle", "nsis");
  console.log(JSON.stringify({ built: true, mode: "local", profile, architecture, output }, null, 2));
}

async function buildGithub({ profile, architecture, ...options }) {
  const response = await github(`/actions/workflows/${workflow}/dispatches`, options, {
    method: "POST",
    body: JSON.stringify({ ref: options.ref || "main", inputs: { profile, architecture } }),
    headers: { "Content-Type": "application/json" }
  });
  console.log(JSON.stringify({ started: true, mode: "github", profile, architecture, ref: options.ref || "main", status: response.status }, null, 2));
}

async function doctor() {
  const tools = ["node", "npm", "rustc", "cargo"];
  const result = {};
  for (const tool of tools) {
    try {
      result[tool] = execFileSync(process.platform === "win32" ? "where.exe" : "which", [tool], { encoding: "utf8" }).trim();
    } catch {
      result[tool] = null;
    }
  }
  result.platform = process.platform;
  result.localWindowsBuildReady = process.platform === "win32" && Boolean(result.node && result.npm && result.rustc && result.cargo);
  console.log(JSON.stringify(result, null, 2));
}

async function runs(options) {
  const response = await github(`/actions/workflows/${workflow}/runs?per_page=${options.limit || 10}`, options);
  const data = await response.json();
  console.log(JSON.stringify(data.workflow_runs.map((run) => ({
    id: run.id, status: run.status, conclusion: run.conclusion, event: run.event,
    branch: run.head_branch, commit: run.head_sha, url: run.html_url, createdAt: run.created_at
  })), null, 2));
}

async function status(options) {
  const response = await github(`/actions/runs/${required(options.run, "--run")}`, options);
  const run = await response.json();
  console.log(JSON.stringify({ id: run.id, status: run.status, conclusion: run.conclusion, url: run.html_url }, null, 2));
}

async function download(options) {
  const response = await github(`/actions/runs/${required(options.run, "--run")}/artifacts`, options);
  const data = await response.json();
  const artifact = options.name
    ? data.artifacts.find((item) => item.name === options.name)
    : data.artifacts[0];
  if (!artifact) fail("该运行没有可下载的 Artifact");
  const output = resolve(root, options.out || `${artifact.name}.zip`);
  mkdirSync(dirname(output), { recursive: true });
  const fileResponse = await github(`/actions/artifacts/${artifact.id}/zip`, options);
  await pipeline(Readable.fromWeb(fileResponse.body), createWriteStream(output));
  console.log(JSON.stringify({ id: artifact.id, name: artifact.name, size: artifact.size_in_bytes, path: output }, null, 2));
}

function help() {
  console.log(`用法：
  node scripts/product-packager.mjs list [--repo owner/name]
  node scripts/product-packager.mjs validate [--profile profiles/libtv.json]
  node scripts/product-packager.mjs add --title NAME --url HTTPS_URL --icon IMAGE --identifier REVERSE_DOMAIN [--push]
  node scripts/product-packager.mjs doctor
  node scripts/product-packager.mjs build --profile profiles/libtv.json [--arch x64] [--mode local|github] [--ref main]
  node scripts/product-packager.mjs build-local --profile profiles/libtv.json [--arch x64]
  node scripts/product-packager.mjs build-github --profile profiles/libtv.json [--arch x64] [--ref main]
  node scripts/product-packager.mjs runs [--limit 10]
  node scripts/product-packager.mjs status --run RUN_ID
  node scripts/product-packager.mjs download --run RUN_ID [--name ARTIFACT] [--out FILE]

环境变量：GITHUB_TOKEN、GITHUB_REPOSITORY=owner/name`);
}

const command = process.argv[2];
const options = argsOf(process.argv.slice(3));
try {
  if (command === "list") await list(options);
  else if (command === "validate") await validate(options);
  else if (command === "add") await add(options);
  else if (command === "doctor") await doctor();
  else if (command === "build" || command === "build-local" || command === "build-github") {
    await build({ ...options, mode: command === "build" ? (options.mode || "local") : command.slice(6) });
  }
  else if (command === "runs") await runs(options);
  else if (command === "status") await status(options);
  else if (command === "download") await download(options);
  else help();
} catch (error) {
  console.error(`错误：${error.message}`);
  process.exitCode = 1;
}
