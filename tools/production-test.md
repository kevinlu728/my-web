# CDN映射模块生产环境测试指南

本指南提供了在生产环境中测试CDN映射模块重构效果的方法。

## 真实场景测试

### 1. 部署前兼容性验证

在将重构后的代码部署到生产环境之前，我们需要进行全面的兼容性测试：

```bash
# 1. 克隆测试环境
git clone https://github.com/your-org/my-web.git my-web-test
cd my-web-test

# 2. 安装依赖
npm install

# 3. 运行自动化测试套件
npm test

# 4. 启动测试服务器
npm start
```

### 2. 端到端测试

在浏览器中进行的手动测试步骤：

1. **正常资源加载测试**
   - 打开浏览器开发者工具的网络面板
   - 刷新页面
   - 验证所有CSS和JS资源都成功加载
   - 检查页面上的组件是否正常显示（图标、代码高亮等）

2. **CDN回退测试**
   - 打开开发者工具中的网络面板
   - 找到一个外部CDN资源（如bootstrap-icons.css）
   - 右键选择"Block Request URL"
   - 刷新页面
   - 验证是否自动降级到备用CDN或本地版本
   - 检查控制台是否有适当的警告/错误消息

3. **组件资源加载测试**
   - 导航到包含代码块的页面
   - 确认代码高亮功能正常工作
   - 验证各种语言（如JavaScript、Python、CSS等）的语法高亮是否正确
   - 检查控制台中与Prism组件加载相关的日志

4. **性能对比测试**
   - 使用浏览器的Performance面板记录页面加载性能
   - 分析资源加载时间，特别关注外部资源加载部分
   - 对比重构前后的性能数据

## 使用Chrome开发者工具监控

### 网络监控

1. 打开Chrome DevTools (F12)
2. 切换到Network标签页
3. 刷新页面
4. 关注以下指标：
   - `DOMContentLoaded` 和 `Load` 事件时间
   - 外部资源加载时间
   - 资源加载瀑布图中的阻塞时间

### 性能监控

使用Chrome的Performance面板进行性能分析：

1. 打开Chrome DevTools (F12)
2. 切换到Performance标签页
3. 点击"Record"按钮
4. 刷新页面
5. 停止录制
6. 分析JavaScript执行时间，特别关注：
   - `resourceManager.js` 和 `cdn-mapper.js` 的执行时间
   - 资源加载相关的函数调用时间

### 内存使用监控

1. 打开Chrome DevTools (F12)
2. 切换到Memory标签页
3. 选择"Heap snapshot"
4. 拍摄快照
5. 在过滤器中搜索"ResourceManager"
6. 分析实例数量和内存占用

## 使用Performance API收集数据

在生产环境中，可以添加以下代码片段来收集性能数据：

```javascript
// 在页面底部添加此脚本来收集性能数据
<script>
document.addEventListener('DOMContentLoaded', () => {
  // 等待页面完全加载
  window.addEventListener('load', () => {
    setTimeout(() => {
      // 收集性能计时数据
      const perfData = performance.getEntriesByType('resource');
      
      // 过滤并分析CDN资源
      const cdnResources = perfData.filter(entry => 
        entry.name.includes('cdn') || 
        entry.name.includes('jsdelivr') || 
        entry.name.includes('unpkg') || 
        entry.name.includes('cdnjs')
      );
      
      // 计算平均加载时间
      const avgLoadTime = cdnResources.reduce((sum, res) => 
        sum + res.duration, 0) / cdnResources.length;
      
      // 输出结果
      console.log(`CDN资源平均加载时间: ${avgLoadTime.toFixed(2)}ms`);
      console.log(`CDN资源总数: ${cdnResources.length}`);
      
      // 可以将这些数据发送到服务器进行分析
    }, 1000);
  });
});
</script>
```

## 模拟网络降级

为了测试在不同网络条件下的性能，可以使用Chrome开发者工具的网络限制功能：

1. 打开Chrome DevTools (F12)
2. 切换到Network标签页
3. 在顶部找到"No throttling"下拉菜单
4. 选择不同的网络条件（如"Slow 3G"）
5. 刷新页面
6. 观察CDN资源加载和回退行为

## 生产环境A/B测试

为了在真实用户环境中评估重构效果，可以设置A/B测试：

```javascript
```

## 结果分析和比较

在完成测试后，我们应该收集和分析以下数据指标：

1. **功能指标**
   - 资源加载成功率
   - 回退机制成功率
   - 功能错误率

2. **性能指标**
   - 页面加载时间
   - 资源加载时间
   - 首次内容绘制时间
   - 首次可交互时间

3. **资源使用指标**
   - CPU使用率
   - 内存使用
   - 网络请求数量

通过对比重构前后这些指标的变化，我们可以全面评估CDN映射模块重构的效果。

---

## 测试日志模板

```
# CDN映射重构测试日志

## 测试环境
- 浏览器: [Chrome/Firefox/Safari] 版本: [版本号]
- 操作系统: [Windows/macOS/Linux] 版本: [版本号]
- 网络条件: [良好/一般/差]

## 功能测试结果
1. 正常资源加载: [通过/失败] - [备注]
2. CDN回退机制: [通过/失败] - [备注]
3. 组件资源加载: [通过/失败] - [备注]
4. 优先级处理: [通过/失败] - [备注]

## 性能测试结果
1. 页面加载时间: [重构前] ms vs [重构后] ms
2. 资源加载平均时间: [重构前] ms vs [重构后] ms
3. 首次内容绘制: [重构前] ms vs [重构后] ms

## 资源使用结果
1. 内存占用: [重构前] MB vs [重构后] MB
2. JavaScript执行时间: [重构前] ms vs [重构后] ms

## 问题与建议
- [问题1]
- [问题2]
- [建议1]

## 结论
[总体评估] 