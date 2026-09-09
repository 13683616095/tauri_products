#!/usr/bin/env node

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PACKAGER_PORT || 8787);
const cli = resolve(root, "scripts/product-packager.mjs");

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [cli, command, ...args], { cwd: root, env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim()));
      try {
        const start = stdout.lastIndexOf("\n{");
        resolvePromise(JSON.parse((start >= 0 ? stdout.slice(start + 1) : stdout).trim()));
      } catch {
        reject(new Error(`控制器输出不是有效 JSON：${stdout.slice(-500)}`));
      }
    });
  });
}

function argsFromQuery(url) {
  const args = [];
  for (const [key, value] of url.searchParams) args.push(`--${key}`, value);
  return args;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { ok: true });
    if (request.method === "GET" && url.pathname === "/profiles") return json(response, 200, await run("list", []));
    if (request.method === "POST" && url.pathname === "/build") {
      return json(response, 200, await run("build", argsFromQuery(url)));
    }
    if (request.method === "POST" && url.pathname === "/build/local") {
      return json(response, 200, await run("build-local", argsFromQuery(url)));
    }
    if (request.method === "POST" && url.pathname === "/build/github") {
      return json(response, 200, await run("build-github", argsFromQuery(url)));
    }
    if (request.method === "GET" && url.pathname === "/runs") return json(response, 200, await run("runs", argsFromQuery(url)));
    const statusMatch = url.pathname.match(/^\/runs\/(\d+)$/);
    if (request.method === "GET" && statusMatch) return json(response, 200, await run("status", ["--run", statusMatch[1], ...argsFromQuery(url)]));
    const downloadMatch = url.pathname.match(/^\/runs\/(\d+)\/download$/);
    if (request.method === "POST" && downloadMatch) return json(response, 200, await run("download", ["--run", downloadMatch[1], ...argsFromQuery(url)]));
    return json(response, 404, { error: "Not found" });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`AI 打包控制器已启动：http://127.0.0.1:${port}`));
