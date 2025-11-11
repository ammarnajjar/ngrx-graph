export function info(...args: unknown[]) {
  console.log('[info]', ...args);
}

export function warn(...args: unknown[]) {
  console.warn('[warn]', ...args);
}

export function error(...args: unknown[]) {
  console.error('[error]', ...args);
}
