import { IStorageProvider } from "./types";
import { LocalStorageProvider } from "./providers/local";
import { getStorageConfig, StorageConfig } from "./config";

/**
 * Storage factory - creates the appropriate storage provider based on config
 */
export class StorageFactory {
  private static instance: IStorageProvider | null = null;

  /**
   * Get storage provider instance (singleton)
   */
  static getProvider(config?: StorageConfig): IStorageProvider {
    if (!this.instance) {
      const storageConfig = config || getStorageConfig();
      this.instance = this.createProvider(storageConfig);
    }
    return this.instance;
  }

  /**
   * Create a new storage provider instance
   */
  static createProvider(config: StorageConfig): IStorageProvider {
    switch (config.provider) {
      case "local":
        if (!config.local) {
          throw new Error("Local storage configuration missing");
        }
        return new LocalStorageProvider(config.local.baseDir);

      case "s3":
      case "r2":
      case "minio":
        // TODO: Implement S3-compatible provider
        throw new Error(`Storage provider '${config.provider}' not yet implemented. Use 'local' for now.`);

      default:
        throw new Error(`Unknown storage provider: ${config.provider}`);
    }
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
  }
}

/**
 * Convenience function to get the default storage provider
 */
export function getStorage(): IStorageProvider {
  return StorageFactory.getProvider();
}
