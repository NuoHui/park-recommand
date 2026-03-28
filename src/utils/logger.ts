import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '@/config/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 创建日志目录
const logDir = path.join(__dirname, '../../', env.logFile.split('/')[0]);

const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'park-recommender' },
  transports: [
    // Console 输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    // 文件输出（错误）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),
    // 文件输出（全部）
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
    }),
  ],
});

export default logger;

export const createLogger = (module: string) => {
  return logger.child({ module });
};
