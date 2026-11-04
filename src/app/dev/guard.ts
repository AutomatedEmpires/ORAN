import { config } from '@/modules/platform';

// Host header of the local launcher: a loopback name with an optional port, and nothing else (no userinfo, path or query).
const loopbackHost = /^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d{1,5})?$/i;

// Every condition is required and any exception means "no". Production and Vercel are refused before config() is asked.
export function catalogAllowed(env: Record<string, string | undefined>, host: string | null): boolean {
  try {
    if (env.ORAN_LOCAL_DEV !== '1' || env.NODE_ENV === 'production' || env.VERCEL) return false;
    const settings = config(env);
    if (!settings.local || settings.stage !== 'development') return false;
    if (!host || !loopbackHost.test(host)) return false;
    return ['127.0.0.1', 'localhost', '[::1]'].includes(new URL('http://' + host).hostname);
  } catch {
    return false;
  }
}
