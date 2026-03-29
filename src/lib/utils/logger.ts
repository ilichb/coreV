/**
 * Andromeda Core - Structured Logger
 */
type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogMeta = Record<string, unknown> | Error | unknown;

class Logger {
    private isProduction = process.env.NODE_ENV === 'production';

    private normalizeMeta(meta: LogMeta): Record<string, unknown> | undefined {
        if (meta === undefined || meta === null) return undefined;
        if (meta instanceof Error) return { error: meta.message, stack: meta.stack };
        if (typeof meta === 'object') return meta as Record<string, unknown>;
        return { value: String(meta) };
    }

    private log(level: LogLevel, message: string, meta?: LogMeta) {
        const normalized = this.normalizeMeta(meta);
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level, message, ...normalized };
        if (this.isProduction) {
            console.log(JSON.stringify(logEntry));
        } else {
            const colors: Record<LogLevel, string> = {
                info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', debug: '\x1b[90m'
            };
            const metaStr = normalized ? ` | ${JSON.stringify(normalized)}` : '';
            console.log(`${colors[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}\x1b[0m`);
        }
    }

    info(message: string, meta?: LogMeta) { this.log('info', message, meta); }
    warn(message: string, meta?: LogMeta) { this.log('warn', message, meta); }
    error(message: string, meta?: LogMeta) { this.log('error', message, meta); }
    debug(message: string, meta?: LogMeta) { this.log('debug', message, meta); }
}

export const logger = new Logger();
