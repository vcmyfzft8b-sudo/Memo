import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const nextPath = path.join(projectRoot, ".next");

function ensureTmpNodeModules(targetPath) {
  const nodeModulesPath = path.join(targetPath, "node_modules");
  const projectNodeModulesPath = path.join(projectRoot, "node_modules");

  try {
    const current = fs.readlinkSync(nodeModulesPath);
    if (current === projectNodeModulesPath) {
      return;
    }
    fs.unlinkSync(nodeModulesPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      const code = error.code;
      if (code !== "EINVAL" && code !== "ENOENT") {
        throw error;
      }
    }
  }

  if (fs.existsSync(nodeModulesPath)) {
    return;
  }

  fs.symlinkSync(projectNodeModulesPath, nodeModulesPath);
}

try {
  const stat = fs.lstatSync(nextPath);
  if (!stat.isSymbolicLink()) {
    process.exit(0);
  }

  const targetPath = fs.realpathSync(nextPath);
  ensureTmpNodeModules(targetPath);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    process.exit(0);
  }

  throw error;
}
