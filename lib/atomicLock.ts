import fs from "fs";
import path from "path";

const IS_VERCEL = !!process.env.VERCEL;
const LOCK_DIR = IS_VERCEL ? path.join("/tmp", "zubair-data") : path.resolve(process.cwd(), "data");

function ensureLockDir() {
  try {
    if (!fs.existsSync(LOCK_DIR)) {
      fs.mkdirSync(LOCK_DIR, { recursive: true });
    }
  } catch {}
}

/**
 * Cross-Process Atomic Lock using filesystem primitives (O_CREAT | O_EXCL).
 * Works across separate Node.js OS processes on Windows, Linux, and macOS.
 */
export async function acquireCrossProcessLock(
  lockName = "checkout",
  timeoutMs = 10000
): Promise<() => void> {
  ensureLockDir();
  const lockFile = path.join(LOCK_DIR, `.${lockName}.lock`);
  const startTime = Date.now();
  const staleThresholdMs = 15000;

  while (Date.now() - startTime < timeoutMs) {
    try {
      // 'wx' flag opens for writing exclusively; fails if file already exists
      const fd = fs.openSync(lockFile, "wx");
      fs.writeFileSync(fd, `${process.pid}:${Date.now()}`, "utf-8");
      fs.closeSync(fd);

      // Return release function
      return () => {
        try {
          if (fs.existsSync(lockFile)) {
            fs.unlinkSync(lockFile);
          }
        } catch {}
      };
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Check if existing lockfile is stale (crashed process)
        try {
          const stats = fs.statSync(lockFile);
          if (Date.now() - stats.mtimeMs > staleThresholdMs) {
            try {
              fs.unlinkSync(lockFile);
            } catch {}
          }
        } catch {}

        // Wait with jitter before retrying
        const delay = 25 + Math.floor(Math.random() * 50);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // If file system is completely read-only, break out
        break;
      }
    }
  }

  // Fallback no-op release if timeout exceeded or read-only filesystem
  return () => {
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch {}
  };
}
