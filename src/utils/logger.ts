const LOG_PREFIX = '[天玄江湖]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function createLogger(tag: string): Logger {
  const prefix = `${LOG_PREFIX}[${tag}]`;

  // eslint-disable-next-line no-console
  const logFn = (level: LogLevel) => {
    const fn = console[level] as (...args: unknown[]) => void;
    return (...args: unknown[]) => {
      if (import.meta.env.PROD && level === 'debug') return;
      fn(prefix, ...args);
    };
  };

  return {
    debug: logFn('debug'),
    info: logFn('info'),
    warn: logFn('warn'),
    error: logFn('error'),
  };
}

export const logger = {
  ai: createLogger('AI'),
  game: createLogger('Game'),
  image: createLogger('Image'),
  parser: createLogger('Parser'),
  storage: createLogger('Storage'),
  core: createLogger('Core'),
};

export type { Logger };
