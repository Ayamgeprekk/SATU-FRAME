import path from 'path';
import fs from 'fs';

export function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export function getUploadsDir(sessionId?: string): string {
  const baseDir = isVercelEnvironment()
    ? path.join('/tmp', 'temp_uploads')
    : path.join(process.cwd(), 'temp_uploads');

  if (sessionId) {
    return path.join(baseDir, sessionId);
  }
  return baseDir;
}

export function ensureDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function getStorageFilePath(sessionId: string, fileName: string): string {
  const safeFileName = path.basename(fileName);
  const primaryDir = getUploadsDir(sessionId);
  const primaryPath = path.join(primaryDir, safeFileName);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const secondaryDir = isVercelEnvironment()
    ? path.join(process.cwd(), 'temp_uploads', sessionId)
    : path.join('/tmp', 'temp_uploads', sessionId);
  const secondaryPath = path.join(secondaryDir, safeFileName);
  if (fs.existsSync(secondaryPath)) {
    return secondaryPath;
  }

  return primaryPath;
}
