export interface CrashLogEntry {
  id: string;
  time: number;
  type: 'error' | 'promise' | 'react' | 'warning' | 'image';
  message: string;
  stack?: string;
  source?: string;
  detail?: any;
  url: string;
  userAgent: string;
}

const CRASH_LOG_KEY = 'jianghu_crash_logs';
const MAX_LOGS = 100;

export function loadCrashLogs(): CrashLogEntry[] {
  try {
    const raw = localStorage.getItem(CRASH_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCrashLogs(logs: CrashLogEntry[]) {
  try {
    localStorage.setItem(CRASH_LOG_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch {
    // ignore
  }
}

export function addCrashLog(partial: Omit<CrashLogEntry, 'id' | 'time' | 'url' | 'userAgent'>) {
  const entry: CrashLogEntry = {
    id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    time: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    ...partial,
  };
  const logs = loadCrashLogs();
  logs.push(entry);
  saveCrashLogs(logs);
  return entry;
}

export function clearCrashLogs() {
  try {
    localStorage.removeItem(CRASH_LOG_KEY);
  } catch {
    // ignore
  }
}

export function installGlobalCrashHandlers() {
  if ((window as any).__JIANGHU_CRASH_LOGGER_INSTALLED__) return;
  (window as any).__JIANGHU_CRASH_LOGGER_INSTALLED__ = true;

  window.addEventListener('error', (event) => {
    addCrashLog({
      type: 'error',
      message: event.message || '未知脚本错误',
      stack: (event.error && event.error.stack) || undefined,
      source: event.filename ? `${event.filename}:${event.lineno}:${event.colno}` : 'window.onerror',
      detail: {
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason: any = event.reason;
    addCrashLog({
      type: 'promise',
      message: reason?.message || String(reason || '未处理的 Promise 异常'),
      stack: reason?.stack,
      source: 'unhandledrejection',
      detail: reason,
    });
  });
}
