import chalk from 'chalk';

/**
 * 格式化距离
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} 米`;
  }
  return `${km.toFixed(1)} 公里`;
}

/**
 * 格式化评分
 */
export function formatRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  let stars = '★'.repeat(fullStars);
  if (hasHalfStar) stars += '½';
  stars += '☆'.repeat(emptyStars);

  return `${stars} ${rating.toFixed(1)}/5.0`;
}

/**
 * 格式化时间（分钟到人性化格式）
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins} 分钟`;
  }

  if (mins === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${mins} 分钟`;
}

/**
 * 格式化时间戳为本地时间
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}

/**
 * 创建分隔线
 */
export function createDivider(char: string = '─', length: number = 50): string {
  return char.repeat(length);
}

/**
 * 创建标题框
 */
export function createTitleBox(title: string, width: number = 60): string {
  const padding = Math.max(0, width - title.length - 4);
  const leftPad = Math.floor(padding / 2);
  const rightPad = Math.ceil(padding / 2);

  const line = '═'.repeat(width);
  const titleLine = `║${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}║`;

  return `╔${line}╗\n${titleLine}\n╚${line}╝`;
}

/**
 * 创建表格
 */
export function createTable(
  headers: string[],
  rows: string[][],
  columnWidths?: number[]
): string {
  const colWidths =
    columnWidths ||
    headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || '').length)));

  const separator = `┌${colWidths.map((w) => '─'.repeat(w + 2)).join('┬')}┐`;
  const headerRow = `│${headers.map((h, i) => ` ${h.padEnd(colWidths[i])} `).join('│')}│`;
  const divider = `├${colWidths.map((w) => '─'.repeat(w + 2)).join('┼')}┤`;
  const dataRows = rows.map(
    (row) => `│${row.map((cell, i) => ` ${(cell || '').padEnd(colWidths[i])} `).join('│')}│`
  );
  const footer = `└${colWidths.map((w) => '─'.repeat(w + 2)).join('┴')}┘`;

  return [separator, headerRow, divider, ...dataRows, footer].join('\n');
}

/**
 * 颜色化输出
 */
export const color = {
  primary: (text: string) => chalk.rgb(0, 180, 216)(text),
  success: (text: string) => chalk.rgb(6, 168, 125)(text),
  warning: (text: string) => chalk.rgb(255, 183, 3)(text),
  error: (text: string) => chalk.rgb(230, 57, 70)(text),
  info: (text: string) => chalk.rgb(0, 119, 182)(text),
  neutral: (text: string) => chalk.rgb(108, 117, 125)(text),
};
