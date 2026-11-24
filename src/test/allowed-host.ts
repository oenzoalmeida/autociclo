const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isAllowedTestHost(input: string | URL | Request): boolean {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const u = new URL(raw);
    return LOCAL.has(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

