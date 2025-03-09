/**
 * @file monitoring.mjs
 * @description 服务器监控工具，提供性能监控、日志记录和健康检查功能
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// 服务器监控工具
import path from 'path';

// 监控配置
const monitoringConfig = {
  enabled: true,
  sampleRate: 1.0,  // 采样率：1.0表示100%
  slowRequestThreshold: 1000, // 慢请求阈值（毫秒）
  maxMetricsHistory: 1000,    // 保留最近1000条指标记录
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
    if (this.responseTime.data.length > monitoringConfig.maxMetricsHistory) {
      this.responseTime.data.shift();
    }
    
    // 更新统计数据
    this.responseTime.avg = this.responseTime.data.reduce((a, b) => a + b, 0) / this.responseTime.data.length;
    this.responseTime.max = Math.max(duration, this.responseTime.max);
    this.responseTime.min = Math.min(duration, this.responseTime.min);

    // 记录慢请求
    if (duration > monitoringConfig.slowRequestThreshold) {
      this.requests.slow++;
      this.slowRequests.push({
        timestamp: new Date().toISOString(),
        duration: duration
      });
      if (this.slowRequests.length > monitoringConfig.maxMetricsHistory) {
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
    if (this.errors.length > monitoringConfig.maxMetricsHistory) {
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
    if (this.alerts.length > monitoringConfig.maxMetricsHistory) {
      this.alerts.shift();
    }
  }
};

// 报警管理器
const alertManager = {
  lastAlerts: new Map(),  // 记录上次报警时间
  
  // 检查是否需要报警
  shouldAlert(type) {
    const lastAlert = this.lastAlerts.get(type);
    const now = Date.now();
    
    if (!lastAlert || (now - lastAlert) > monitoringConfig.alerts.cooldown) {
      this.lastAlerts.set(type, now);
      return true;
    }
    return false;
  },

  // 发送报警
  async sendAlert(type, message) {
    if (!monitoringConfig.alerts.enabled || !this.shouldAlert(type)) return;

    // 记录报警
    console.error(`[ALERT] ${type}: ${message}`);
    
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
    if (errorRate > monitoringConfig.alerts.thresholds.errorRate) {
      await this.sendAlert('high_error_rate', 
        `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(monitoringConfig.alerts.thresholds.errorRate * 100)}%`);
    }

    // 检查慢请求率
    const slowRate = report.requests.slow / total;
    if (slowRate > monitoringConfig.alerts.thresholds.slowRequestRate) {
      await this.sendAlert('high_slow_rate',
        `Slow request rate ${(slowRate * 100).toFixed(2)}% exceeds threshold ${(monitoringConfig.alerts.thresholds.slowRequestRate * 100)}%`);
    }

    // 检查平均响应时间
    if (report.responseTime.avg > monitoringConfig.alerts.thresholds.avgResponseTime) {
      await this.sendAlert('high_response_time',
        `Average response time ${report.responseTime.avg}ms exceeds threshold ${monitoringConfig.alerts.thresholds.avgResponseTime}ms`);
    }

    // 检查成功率
    const successRate = report.requests.success / total;
    if (successRate < monitoringConfig.alerts.thresholds.successRate) {
      await this.sendAlert('low_success_rate',
        `Success rate ${(successRate * 100).toFixed(2)}% below threshold ${(monitoringConfig.alerts.thresholds.successRate * 100)}%`);
    }
  }
};

// 监控面板HTML
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

/**
 * 设置服务器监控
 * @param {Express} app - Express应用实例
 */
export function setupMonitoring(app) {
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
    console.debug(`Request started: ${JSON.stringify(requestInfo)}`);

    // 监听请求结束
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      metrics.requests.total++;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        metrics.requests.success++;
      }

      metrics.updateResponseTime(duration);

      console.debug(
        `Request completed: ${JSON.stringify({
          ...requestInfo,
          statusCode: res.statusCode,
          duration: duration
        })}`
      );
    });

    next();
  });

  // 健康检查端点
  app.get('/health', (req, res) => {
    healthStatus.uptime = Date.now() - healthStatus.startTime;
    
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

  // 添加性能监控端点
  app.get('/metrics', (req, res) => {
    res.json(metrics.getReport());
  });

  // 添加监控面板路由
  app.get('/monitor', (req, res) => {
    res.send(monitoringHtml);
  });

  // 错误处理中间件
  app.use((err, req, res, next) => {
    metrics.recordError(err, {
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId
    });

    console.error(`Error in request ${req.requestId}:`, err);
    res.status(err.status || 500).json({
      error: err.message,
      requestId: req.requestId
    });
  });

  // 启动定期检查
  setInterval(() => alertManager.checkMetrics(), 60000); // 每分钟检查一次

  console.log('监控系统已设置');
} 