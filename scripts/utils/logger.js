/**
 * logger.js - 统一日志管理工具
 * 提供不同级别的日志输出和格式化功能
 */
// 移除对config的直接导入，避免循环依赖

// 日志级别定义
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// 在浏览器环境中无法访问process.env，因此通过配置系统来动态更新日志级别，默认为INFO
// 1. 初始使用默认级别
let currentLogLevel = LOG_LEVELS.INFO;

// 2. 创建一个更新级别的方法，供配置系统调用
const updateLoggerConfig = (config) => {
  if (config && config.logging) {
    // 更新日志级别
    if (config.logging.level && LOG_LEVELS[config.logging.level] !== undefined) {
      currentLogLevel = LOG_LEVELS[config.logging.level];
      // 避免在初始化时产生递归调用
      console.log(`日志级别已更新为: ${config.logging.level}`);
    }
    
    // 支持其他日志配置选项
    // 例如是否使用彩色输出，是否显示调用者信息等
    if (config.logging.useColors !== undefined) {
      // 这里可以添加控制是否使用彩色输出的逻辑
    }
    
    if (config.logging.showCaller !== undefined) {
      // 这里可以添加控制是否显示调用者信息的逻辑
    }
  }
};

// 日志标记颜色（控制台输出）
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * 获取当前时间戳
 * @returns {string} 格式化的时间戳
 */
const getTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

/**
 * 获取调用栈信息
 * @returns {string} 调用位置信息
 */
const getCallerInfo = () => {
  const err = new Error();
  const stack = err.stack.split('\n');
  
  // 在调用栈中查找第一个不是logger.js的文件
  let callerLine = '';
  for (let i = 2; i < stack.length; i++) {
    const line = stack[i];
    // 如果当前行不包含 logger.js，这就是实际的调用者
    if (line && !line.includes('logger.js')) {
      callerLine = line;
      break;
    }
  }
  
  // 如果没找到调用者，就取第三行（尝试最可能的调用位置）
  if (!callerLine) {
    callerLine = stack[3] || '';
  }
  
  const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/) || 
                callerLine.match(/at\s+(.*):(\d+):(\d+)/);
  
  if (match) {
    const [, fnName, filePath, line] = match;
    const fileName = filePath ? filePath.split('/').pop() : '';
    return `${fileName}${fnName ? `:${fnName}` : ''}:${line || ''}`;
  }
  return '';
};

/**
 * 格式化日志消息
 * @param {string} level 日志级别
 * @param {Array} args 日志参数
 * @returns {string} 格式化后的日志消息
 */
const formatLogMessage = (level, args) => {
  const timestamp = getTimestamp();
  const callerInfo = getCallerInfo();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : arg
  ).join(' ');
  
  return `[${timestamp}] [${level}] [${callerInfo}] ${message}`;
};

/**
 * 彩色控制台输出（仅用于开发环境）
 * @param {string} level 日志级别
 * @param {string} message 日志消息
 */
const colorConsoleOutput = (level, message) => {
  let color = COLORS.reset;
  switch (level) {
    case 'DEBUG':
      color = COLORS.gray;
      break;
    case 'INFO':
      color = COLORS.green;
      break;
    case 'WARN':
      color = COLORS.yellow;
      break;
    case 'ERROR':
      color = COLORS.red;
      break;
  }
  
  console.log(`${color}${message}${COLORS.reset}`);
};

// 日志工具对象
const logger = {
  // 添加更新配置的方法
  updateConfig: updateLoggerConfig,
  
  /**
   * 设置日志级别
   * @param {string} level 日志级别名称
   */
  setLevel: (level) => {
    if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
      currentLogLevel = LOG_LEVELS[level.toUpperCase()];
    }
  },
  
  /**
   * 获取当前日志级别
   * @returns {string} 当前日志级别名称
   */
  getLevel: () => {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel);
  },
  
  /**
   * 调试级别日志
   * @param {...any} args 日志内容
   */
  debug: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const message = formatLogMessage('DEBUG', args);
      colorConsoleOutput('DEBUG', message);
    }
  },
  
  /**
   * 信息级别日志
   * @param {...any} args 日志内容
   */
  info: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const message = formatLogMessage('INFO', args);
      colorConsoleOutput('INFO', message);
    }
  },
  
  /**
   * 警告级别日志
   * @param {...any} args 日志内容
   */
  warn: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const message = formatLogMessage('WARN', args);
      colorConsoleOutput('WARN', message);
    }
  },
  
  /**
   * 错误级别日志
   * @param {...any} args 日志内容
   */
  error: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const message = formatLogMessage('ERROR', args);
      colorConsoleOutput('ERROR', message);
    }
  }
};

// 立即设置全局变量，确保其他脚本能立即访问
if (typeof window !== 'undefined') {
  window.loggerModule = logger;
}

// 添加直接的ES模块默认导出
export default logger;

// 保留其他兼容性导出方式
// 支持CommonJS模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}

// 支持ES模块命名导出
export const loggerModule = logger; 