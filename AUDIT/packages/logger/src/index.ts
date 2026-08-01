export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LoggerOptions = {
  name: string;
  level?: LogLevel;
};

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(options: LoggerOptions) {
  const min = levelOrder[options.level ?? 'info'];

  const write = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (levelOrder[level] < min) return;
    const payload = {
      ts: new Date().toISOString(),
      level,
      name: options.name,
      message,
      ...meta,
    };
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
    info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
    error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
    child: (name: string) =>
      createLogger({ name: `${options.name}:${name}`, level: options.level }),
  };
}

export type Logger = ReturnType<typeof createLogger>;
