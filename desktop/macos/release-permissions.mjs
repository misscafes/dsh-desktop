import {chmod, lstat, readdir} from 'node:fs/promises';
import path from 'node:path';

/** 安装器使用 root 所有权；程序目录必须让实际登录用户可遍历、可读取。 */
export async function normalizeReleasePermissions(directory) {
  let directories = 0, files = 0;
  async function visit(file) {
    const stat = await lstat(file);
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      await chmod(file, 0o755);
      directories++;
      for (const entry of await readdir(file)) await visit(path.join(file, entry));
    } else if (stat.isFile()) {
      await chmod(file, stat.mode & 0o111 ? 0o755 : 0o644);
      files++;
    }
  }
  await visit(directory);
  return {directories, files};
}
