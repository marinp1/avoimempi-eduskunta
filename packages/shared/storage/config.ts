import path from "node:path";

export type StorageProviderType = "local";

export interface StorageConfig {
  provider: StorageProviderType;
  local?: {
    baseDir: string;
  };
}

/**
 * Get storage configuration from environment variables or defaults
 */
export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER ||
    "local") as StorageProviderType;

  const config: StorageConfig = {
    provider,
  };

  // Find the repository root by looking for indicators of repo root
  const findRepoRoot = (): string => {
    const fs = require("node:fs");
    let currentDir = process.cwd();
    const maxLevels = 10;

    for (let i = 0; i < maxLevels; i++) {
      // Check for .git directory (most reliable indicator of repo root)
      const gitPath = path.join(currentDir, ".git");
      if (fs.existsSync(gitPath)) {
        return currentDir;
      }

      // Check for packages/ directory + package.json (monorepo pattern)
      const packagesPath = path.join(currentDir, "packages");
      const pkgPath = path.join(currentDir, "package.json");
      if (fs.existsSync(packagesPath) && fs.existsSync(pkgPath)) {
        return currentDir;
      }

      // Check for workspace configuration
      try {
        const pkg = require(pkgPath);
        if (pkg.workspaces && Array.isArray(pkg.workspaces)) {
          return currentDir;
        }
      } catch {
        // package.json doesn't exist or can't be read
      }

      const parent = path.dirname(currentDir);
      if (parent === currentDir) break; // Reached filesystem root
      currentDir = parent;
    }

    // Fallback to cwd if no repo root found
    return process.cwd();
  };

  const defaultBaseDir = path.join(findRepoRoot(), "data");

  config.local = {
    baseDir: process.env.STORAGE_LOCAL_DIR || defaultBaseDir,
  };

  return config;
}
