import path from "path";

export type StorageProviderType = "local" | "s3" | "r2" | "minio";

export interface StorageConfig {
  provider: StorageProviderType;
  local?: {
    baseDir: string;
  };
  s3?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For S3-compatible services
  };
}

/**
 * Get storage configuration from environment variables or defaults
 */
export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || "local") as StorageProviderType;

  const config: StorageConfig = {
    provider,
  };

  if (provider === "local") {
    // Find the repository root by looking for package.json with workspaces
    const findRepoRoot = (): string => {
      let currentDir = process.cwd();
      const maxLevels = 5;

      for (let i = 0; i < maxLevels; i++) {
        const pkgPath = path.join(currentDir, "package.json");
        try {
          const pkg = require(pkgPath);
          if (pkg.workspaces) {
            return currentDir;
          }
        } catch {
          // package.json doesn't exist or can't be read
        }

        const parent = path.dirname(currentDir);
        if (parent === currentDir) break; // Reached root
        currentDir = parent;
      }

      // Fallback to cwd
      return process.cwd();
    };

    const defaultBaseDir = path.join(findRepoRoot(), "data");

    config.local = {
      baseDir: process.env.STORAGE_LOCAL_DIR || defaultBaseDir,
    };
  } else if (provider === "s3" || provider === "r2" || provider === "minio") {
    config.s3 = {
      region: process.env.STORAGE_S3_REGION || "auto",
      bucket: process.env.STORAGE_S3_BUCKET || "",
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.STORAGE_S3_SECRET_ACCESS_KEY || "",
      endpoint: process.env.STORAGE_S3_ENDPOINT, // Required for R2/MinIO
    };
  }

  return config;
}
