import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 基础配置
const config = {
    port: process.env.PORT || 8000,
    notion: {
        apiKey: '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',
        defaultDatabaseId: '1a932af826e680df8bf7f320b51930b9',
      headers: {
            'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
        timeout: 10000,     // 10秒超时
        cacheTime: 5 * 60 * 1000, // 5分钟缓存
        healthCheck: {
            interval: 60000,  // 每分钟检查一次
            timeout: 5000    // 健康检查超时时间
        },
        retry: {
            maxAttempts: 3, // 最大重试次数
            delay: 1000,    // 初始延迟（毫秒）
            maxDelay: 5000  // 最大延迟（毫秒）
        },
        rateLimit: {
            windowMs: 60000,  // 1分钟窗口
            maxRequests: 30   // 最大请求数
        }
    },
    monitoring: {
        enabled: true,
        sampleRate: 1.0,  // 采样率：1.0表示100%
        slowRequestThreshold: 1000, // 慢请求阈值（毫秒）
        maxMetricsHistory: 1000,    // 保留最近1000条指标记录
    },
    alerts: {
        enabled: true,
        thresholds: {
            errorRate: 0.1,        // 错误率阈值：10%
            slowRequestRate: 0.2,   // 慢请求率阈值：20%
            avgResponseTime: 2000,  // 平均响应时间阈值：2秒
            successRate: 0.95      // 成功率阈值：95%
        },
        cooldown: 5 * 60 * 1000,  // 报警冷却时间：5分钟
    }
};

// 服务健康状态
const healthStatus = {
    isHealthy: true,
    lastCheck: Date.now(),
    notionApiStatus: 'unknown',
    uptime: 0,
    startTime: Date.now(),
    errors: []
};

// 日志工具
const logger = {
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[DEBUG] ${message}`, ...args)
};

// 性能指标收集器
const metrics = {
    requests: {
        total: 0,
        success: 0,
        failed: 0,
        slow: 0
    },
    responseTime: {
        data: [],  // 存储最近的响应时间
        avg: 0,    // 平均响应时间
        max: 0,    // 最大响应时间
        min: Infinity // 最小响应时间
    },
    errors: [],   // 错误历史
    slowRequests: [], // 慢请求记录
    alerts: [],

    // 更新响应时间统计
    updateResponseTime(duration) {
        this.responseTime.data.push(duration);
        if (this.responseTime.data.length > config.monitoring.maxMetricsHistory) {
            this.responseTime.data.shift();
        }
        
        // 更新统计数据
        this.responseTime.avg = this.responseTime.data.reduce((a, b) => a + b, 0) / this.responseTime.data.length;
        this.responseTime.max = Math.max(duration, this.responseTime.max);
        this.responseTime.min = Math.min(duration, this.responseTime.min);

        // 记录慢请求
        if (duration > config.monitoring.slowRequestThreshold) {
            this.requests.slow++;
            this.slowRequests.push({
                timestamp: new Date().toISOString(),
                duration: duration
            });
            if (this.slowRequests.length > config.monitoring.maxMetricsHistory) {
                this.slowRequests.shift();
            }
        }
    },

    // 记录错误
    recordError(error, context = {}) {
        const errorRecord = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            context
        };
        this.errors.push(errorRecord);
        if (this.errors.length > config.monitoring.maxMetricsHistory) {
            this.errors.shift();
        }
        this.requests.failed++;
    },

    // 获取性能报告
    getReport() {
        return {
            requests: { ...this.requests },
            responseTime: {
                avg: Math.round(this.responseTime.avg),
                max: this.responseTime.max,
                min: this.responseTime.min === Infinity ? 0 : this.responseTime.min
            },
            recentErrors: this.errors.slice(-10),
            recentSlowRequests: this.slowRequests.slice(-10),
            recentAlerts: this.alerts.slice(-10)
        };
    },

    recordAlert(alert) {
        this.alerts.push(alert);
        if (this.alerts.length > config.monitoring.maxMetricsHistory) {
            this.alerts.shift();
        }
    }
};

// 请求限流实现
const rateLimiter = {
    requests: new Map(),
    
    isAllowed(clientId = 'default') {
        const now = Date.now();
        const windowStart = now - config.notion.rateLimit.windowMs;
        
        // 清理过期的请求记录
        this.cleanup(windowStart);
        
        // 获取当前窗口的请求记录
        const requestTimes = this.requests.get(clientId) || [];
        const recentRequests = requestTimes.filter(time => time > windowStart);
        
        // 检查是否超出限制
        if (recentRequests.length >= config.notion.rateLimit.maxRequests) {
            return false;
        }
        
        // 记录新请求
        recentRequests.push(now);
        this.requests.set(clientId, recentRequests);
        return true;
    },
    
    cleanup(windowStart) {
        for (const [clientId, times] of this.requests.entries()) {
            const validTimes = times.filter(time => time > windowStart);
            if (validTimes.length === 0) {
                this.requests.delete(clientId);
            } else {
                this.requests.set(clientId, validTimes);
            }
        }
    }
};

// 简单的内存缓存实现
const cache = {
    data: new Map(),
    
    // 获取缓存
    get(key) {
        const item = this.data.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (Date.now() > item.expiry) {
            this.data.delete(key);
            return null;
        }
        
        return item.value;
    },
    
    // 设置缓存
    set(key, value, ttl = config.notion.cacheTime) {
        this.data.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    },
    
    // 清除指定键的缓存
    delete(key) {
        this.data.delete(key);
    },
    
    // 清除所有缓存
    clear() {
        this.data.clear();
    }
};

// 获取所有块内容
async function getAllBlockChildren(blockId) {
    let allBlocks = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const response = await fetch(
            `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100${startCursor ? `&start_cursor=${startCursor}` : ''}`,
            {
                method: 'GET',
                headers: config.notion.headers
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch blocks: ${response.status}`);
        }

        const data = await response.json();
        allBlocks = allBlocks.concat(data.results);
        hasMore = data.has_more;
        startCursor = data.next_cursor;
    }

    return allBlocks;
}

// Notion API 工具函数
const notionApi = {
    // 延迟函数
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // 计算重试延迟时间
    getRetryDelay(attempt) {
        const { delay, maxDelay } = config.notion.retry;
        const retryDelay = delay * Math.pow(2, attempt - 1); // 指数退避
        return Math.min(retryDelay, maxDelay);
    },

    // 超时处理函数
    async withTimeout(promise) {
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), config.notion.timeout);
        });
        return Promise.race([promise, timeout]);
    },

    // 统一的API调用函数
    async fetch(endpoint, options = {}, attempt = 1) {
        const cacheKey = `${endpoint}:${JSON.stringify(options)}`;
        
        // 检查缓存
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            logger.info(`Using cached data for ${endpoint}`);
            return cachedData;
        }

        // 检查请求限流
        if (!rateLimiter.isAllowed()) {
            logger.warn('Rate limit exceeded');
            throw new Error('请求过于频繁，请稍后重试');
        }

        const url = `https://api.notion.com/v1/${endpoint}`;
        try {
            const response = await this.withTimeout(
                fetch(url, {
                    ...options,
                    headers: config.notion.headers
                })
            );

            logger.info(`Notion API ${options.method || 'GET'} ${endpoint}: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                logger.error(`Notion API error: ${response.status}`, errorText);
                
                const errorMessage = {
                    404: '数据库或页面未找到。请确保集成已获得正确权限。',
                    401: 'API令牌无效或已过期。请检查API令牌。',
                    403: '权限不足。请检查集成权限设置。',
                    429: '请求过于频繁，请稍后重试。'
                }[response.status] || '请求失败';

                // 对特定错误进行重试
                if ((response.status === 429 || response.status >= 500) && 
                    attempt < config.notion.retry.maxAttempts) {
                    const retryDelay = this.getRetryDelay(attempt);
                    logger.warn(`Retrying request (${attempt}/${config.notion.retry.maxAttempts}) after ${retryDelay}ms`);
                    await this.delay(retryDelay);
                    return this.fetch(endpoint, options, attempt + 1);
                }

                throw new Error(errorMessage);
    }
    
    const data = await response.json();
            
            // 缓存响应数据
            if (options.method === 'GET' || endpoint.includes('query')) {
                cache.set(cacheKey, data);
            }

            return data;
  } catch (error) {
            if (error.message === '请求超时' && attempt < config.notion.retry.maxAttempts) {
                const retryDelay = this.getRetryDelay(attempt);
                logger.warn(`Request timeout, retrying (${attempt}/${config.notion.retry.maxAttempts}) after ${retryDelay}ms`);
                await this.delay(retryDelay);
                return this.fetch(endpoint, options, attempt + 1);
            }
            throw error;
        }
    },

    // 查询数据库
    async queryDatabase(databaseId = config.notion.defaultDatabaseId) {
        return this.fetch(`databases/${databaseId}/query`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    // 测试API连接
    async testConnection() {
        // 测试连接不使用缓存
        cache.delete('users/me');
        return this.fetch('users/me');
    },

    // 获取数据库列表
    async listDatabases() {
        return this.fetch('search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        }
      })
    });
    },

    // 获取页面内容
    async getPageContent(pageId) {
        try {
            const [pageData, blocks] = await Promise.all([
                this.fetch(`pages/${pageId}`),
                getAllBlockChildren(pageId)
            ]);

            return {
                page: pageData,
                results: blocks || []
            };
        } catch (error) {
            logger.error('Error in getPageContent:', error);
            throw error;
        }
    },

    // 清除所有缓存
    clearCache() {
        cache.clear();
        logger.info('Cache cleared');
    }
};

// 健康检查函数
async function checkHealth() {
    try {
        const startTime = Date.now();
        const response = await fetch('https://api.notion.com/v1/users/me', {
            method: 'GET',
            headers: config.notion.headers,
            timeout: config.notion.healthCheck.timeout
        });

        healthStatus.lastCheck = Date.now();
        healthStatus.notionApiStatus = response.ok ? 'healthy' : 'unhealthy';
        healthStatus.isHealthy = response.ok;
        healthStatus.uptime = Date.now() - healthStatus.startTime;

        // 只保留最近10条错误记录
        while (healthStatus.errors.length > 10) {
            healthStatus.errors.shift();
        }

        logger.info(`Health check completed in ${Date.now() - startTime}ms`);
    } catch (error) {
        healthStatus.isHealthy = false;
        healthStatus.notionApiStatus = 'error';
        healthStatus.errors.push({
            time: new Date().toISOString(),
            error: error.message
        });
        logger.error('Health check failed:', error);
    }
}

// 启动定期健康检查
const healthCheckInterval = setInterval(checkHealth, config.notion.healthCheck.interval);

const app = express();

// 添加静态文件服务
app.use(express.static(__dirname));
app.use(express.json());

// 添加中间件来记录API请求
app.use('/api', (req, res, next) => {
    logger.debug(`API Request: ${req.method} ${req.path}`);
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.debug(`API Response: ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: healthStatus.isHealthy ? 'healthy' : 'unhealthy',
        details: {
            notionApi: healthStatus.notionApiStatus,
            uptime: healthStatus.uptime,
            lastCheck: new Date(healthStatus.lastCheck).toISOString(),
            recentErrors: healthStatus.errors
        }
    });
});

// API 路由
app.post('/api/articles', async (req, res) => {
    try {
        logger.info('Fetching articles from Notion database...');
        const databaseId = req.body.database_id || config.notion.defaultDatabaseId;
        
        const data = await notionApi.queryDatabase(databaseId);
        
        if (data.results?.length > 0) {
            data.results.sort((a, b) => {
                const timeA = new Date(a.created_time || 0);
                const timeB = new Date(b.created_time || 0);
                return timeB - timeA;
            });
        }
        
        res.json(data);
    } catch (error) {
        logger.error('Error fetching articles:', error);
        res.status(error.message.includes('超时') ? 504 : 500).json({ 
            error: 'Failed to fetch articles', 
            message: error.message 
        });
    }
});

// 获取块的子块数据
app.get('/api/blocks/:blockId/children', async (req, res) => {
    try {
        const { blockId } = req.params;
        logger.info(`Fetching children blocks for block: ${blockId}`);
        
        const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
            method: 'GET',
            headers: config.notion.headers
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch block children: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        logger.error('Error fetching block children:', error);
        res.status(500).json({ 
            error: 'Error fetching block children', 
            message: error.message 
        });
    }
});

app.get('/api/notion-test', async (req, res) => {
    try {
        const data = await notionApi.testConnection();
        res.json({
            message: 'Notion API connection successful',
            user: data
        });
    } catch (error) {
        logger.error('Error testing Notion API:', error);
        res.status(500).json({ 
            error: 'Error testing Notion API', 
            message: error.message 
        });
    }
});

app.get('/api/databases', async (req, res) => {
    try {
        const data = await notionApi.listDatabases();
    res.json(data);
  } catch (error) {
        logger.error('Error fetching databases:', error);
        res.status(500).json({ 
            error: 'Error fetching databases', 
            message: error.message 
        });
    }
});

app.get('/api/article-content/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
        const data = await notionApi.getPageContent(pageId);
        res.json(data);
    } catch (error) {
        logger.error('Error fetching article content:', error);
        res.status(500).json({ 
            error: 'Error fetching article content', 
            message: error.message 
        });
    }
});

// 添加清除缓存的路由（仅用于调试）
app.post('/api/clear-cache', (req, res) => {
    notionApi.clearCache();
    res.json({ message: 'Cache cleared successfully' });
});

// 添加请求追踪中间件
app.use((req, res, next) => {
    // 生成请求ID
    const requestId = Math.random().toString(36).substring(7);
    req.requestId = requestId;

    // 记录请求开始时间
    const startTime = Date.now();
    
    // 记录原始URL和方法
    const requestInfo = {
        method: req.method,
        url: req.originalUrl || req.url,
        requestId
    };

    // 记录请求开始
    logger.debug(`Request started: ${JSON.stringify(requestInfo)}`);

    // 监听请求结束
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        metrics.requests.total++;
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
            metrics.requests.success++;
        }

        metrics.updateResponseTime(duration);

        logger.debug(
            `Request completed: ${JSON.stringify({
                ...requestInfo,
                statusCode: res.statusCode,
                duration: duration
            })}`
        );
    });

    next();
});

// 添加性能监控端点
app.get('/metrics', (req, res) => {
    res.json(metrics.getReport());
});

// 页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tech-blog.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'tech-blog.html'));
});

// 修改错误处理中间件
app.use((err, req, res, next) => {
    metrics.recordError(err, {
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId
    });

    logger.error(`Error in request ${req.requestId}:`, err);
    res.status(err.status || 500).json({
        error: err.message,
        requestId: req.requestId
    });
});

// 添加监控面板HTML
const monitoringHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>服务监控面板</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
        .error { color: red; }
        .warning { color: orange; }
        .success { color: green; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .refresh-btn { padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .chart { width: 100%; height: 200px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>服务监控面板</h1>
    <button class="refresh-btn" onclick="refreshData()">刷新数据</button>
    
    <div class="card">
        <h2>健康状态</h2>
        <div id="health-status"></div>
    </div>

    <div class="card">
        <h2>请求统计</h2>
        <div id="request-stats"></div>
    </div>

    <div class="card">
        <h2>响应时间</h2>
        <div id="response-times"></div>
    </div>

    <div class="card">
        <h2>最近报警</h2>
        <div id="recent-alerts"></div>
    </div>

    <div class="card">
        <h2>最近错误</h2>
        <div id="recent-errors"></div>
    </div>

    <script>
        async function refreshData() {
            try {
                const [healthData, metricsData] = await Promise.all([
                    fetch('/health').then(r => r.json()),
                    fetch('/metrics').then(r => r.json())
                ]);

                // 更新健康状态
                document.getElementById('health-status').innerHTML = \`
                    <div class="\${healthData.status === 'healthy' ? 'success' : 'error'}">
                        状态: \${healthData.status}<br>
                        Notion API: \${healthData.details.notionApi}<br>
                        运行时间: \${Math.floor(healthData.details.uptime / 1000 / 60)} 分钟
                    </div>
                \`;

                // 更新请求统计
                document.getElementById('request-stats').innerHTML = \`
                    <div class="metric-value">
                        总请求: \${metricsData.requests.total}<br>
                        成功率: \${((metricsData.requests.success / metricsData.requests.total) * 100).toFixed(2)}%<br>
                        慢请求: \${metricsData.requests.slow}
                    </div>
                \`;

                // 更新响应时间
                document.getElementById('response-times').innerHTML = \`
                    <div class="metric-value">
                        平均: \${metricsData.responseTime.avg}ms<br>
                        最大: \${metricsData.responseTime.max}ms<br>
                        最小: \${metricsData.responseTime.min}ms
                    </div>
                \`;

                // 更新报警历史
                document.getElementById('recent-alerts').innerHTML = 
                    metricsData.recentAlerts.map(alert => \`
                        <div class="warning">
                            [\${new Date(alert.timestamp).toLocaleString()}] \${alert.type}: \${alert.message}
                        </div>
                    \`).join('');

                // 更新错误历史
                document.getElementById('recent-errors').innerHTML = 
                    metricsData.recentErrors.map(error => \`
                        <div class="error">
                            [\${new Date(error.timestamp).toLocaleString()}] \${error.error}
                        </div>
                    \`).join('');

            } catch (error) {
                console.error('Failed to refresh data:', error);
            }
        }

        // 初始加载
        refreshData();
        // 每30秒自动刷新
        setInterval(refreshData, 30000);
    </script>
</body>
</html>
`;

// 添加监控面板路由
app.get('/monitor', (req, res) => {
    res.send(monitoringHtml);
});

// 启动定期检查
setInterval(() => alertManager.checkMetrics(), 60000); // 每分钟检查一次

// 创建HTTP服务器
const server = app.listen(config.port, () => {
    logger.info(`Server is running on http://localhost:${config.port}`);
    logger.info(`Visit http://localhost:${config.port} to view the website`);
    logger.info(`Health check endpoint: http://localhost:${config.port}/health`);
});

// 优雅关闭处理
async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    // 停止健康检查
    clearInterval(healthCheckInterval);

    // 给现有请求一些时间完成
    server.close(() => {
        logger.info('HTTP server closed');
        
        // 清理其他资源
        cache.clear();
        
        logger.info('Cleanup completed');
        process.exit(0);
    });

    // 如果15秒后还没有完成，强制退出
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 15000);
}

// 注册进程信号处理器
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    healthStatus.errors.push({
        time: new Date().toISOString(),
        error: `Uncaught Exception: ${error.message}`
    });
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    healthStatus.errors.push({
        time: new Date().toISOString(),
        error: `Unhandled Rejection: ${reason}`
    });
});

// 报警管理器
const alertManager = {
    lastAlerts: new Map(),  // 记录上次报警时间
    
    // 检查是否需要报警
    shouldAlert(type) {
        const lastAlert = this.lastAlerts.get(type);
        const now = Date.now();
        
        if (!lastAlert || (now - lastAlert) > config.alerts.cooldown) {
            this.lastAlerts.set(type, now);
            return true;
        }
        return false;
    },

    // 发送报警
    async sendAlert(type, message) {
        if (!config.alerts.enabled || !this.shouldAlert(type)) return;

        // 记录报警
        logger.error(`[ALERT] ${type}: ${message}`);
        
        // 这里可以添加其他报警方式，如发送邮件、webhook等
        metrics.recordAlert({
            type,
            message,
            timestamp: new Date().toISOString()
        });
    },

    // 检查性能指标
    async checkMetrics() {
        const report = metrics.getReport();
        const total = report.requests.total;
        
        if (total === 0) return;

        // 检查错误率
        const errorRate = report.requests.failed / total;
        if (errorRate > config.alerts.thresholds.errorRate) {
            await this.sendAlert('high_error_rate', 
                `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(config.alerts.thresholds.errorRate * 100)}%`);
        }

        // 检查慢请求率
        const slowRate = report.requests.slow / total;
        if (slowRate > config.alerts.thresholds.slowRequestRate) {
            await this.sendAlert('high_slow_rate',
                `Slow request rate ${(slowRate * 100).toFixed(2)}% exceeds threshold ${(config.alerts.thresholds.slowRequestRate * 100)}%`);
        }

        // 检查平均响应时间
        if (report.responseTime.avg > config.alerts.thresholds.avgResponseTime) {
            await this.sendAlert('high_response_time',
                `Average response time ${report.responseTime.avg}ms exceeds threshold ${config.alerts.thresholds.avgResponseTime}ms`);
        }

        // 检查成功率
        const successRate = report.requests.success / total;
        if (successRate < config.alerts.thresholds.successRate) {
            await this.sendAlert('low_success_rate',
                `Success rate ${(successRate * 100).toFixed(2)}% below threshold ${(config.alerts.thresholds.successRate * 100)}%`);
        }
    }
};
