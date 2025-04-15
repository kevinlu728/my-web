/**
 * @file tableLazyLoader.js
 * @description 表格懒加载工具，用于延迟加载和渲染表格内容
 * @author 陆凯
 * @version 1.2.0
 * @created 2024-03-09
 * @updated 2025-04-15
 * 
 * 该模块实现了表格的懒加载功能，优化页面加载性能：
 * - 使用IntersectionObserver监测表格可见性
 * - 表格进入视口时才加载和渲染
 * - 使用GridJS库提供交互式表格功能（排序、搜索、分页）
 * - 支持从API动态获取表格数据
 * - 提供渲染验证和错误处理机制
 * 
 * 主要方法：
 * - initialize: 初始化懒加载系统
 * - loadTable: 加载表格数据并渲染
 * - renderGridJSTable: 使用GridJS库渲染表格
 * - fetchTableData: 从API获取表格数据
 * - getTableIdentifier: 获取表格的唯一标识符
 * 
 * 事件处理：
 * - 监听GridJS资源加载成功/失败事件
 * - 提供表格加载状态跟踪
 */

import logger from '../utils/logger.js';
import { gridjsLoader } from '../resource/gridjsLoader.js';
import { resourceEvents, RESOURCE_EVENTS } from '../resource/resourceEvents.js';

class TableLazyLoader {
    constructor() {
        this.observer = null;
        this.loadingTables = new Set(); // 跟踪正在加载的表格
    }
    
    initialize() {
        logger.info('初始化表格懒加载...');
        this.initResourceEventListeners();
        this.loadTableResources();
        this.initIntersectionObserver();
        this.addInlineStyles();
    }

    initResourceEventListeners() {
        // 创建加载状态跟踪对象
        const loadStatus = {
            'gridjs-core': false,
            'gridjs-theme': false
        };
        
        // 监听资源加载成功事件
        resourceEvents.on(RESOURCE_EVENTS.LOADING_SUCCESS, (data) => {
            // 更新加载状态
            if (data.resourceId === 'gridjs-core' || data.resourceId === 'gridjs-theme') {
                loadStatus[data.resourceId] = true;
                logger.info(`🔄 资源 ${data.resourceId} 加载成功 [来源: ${data.sender || '未知'}]`);
                
                // 检查所有必要资源是否都已加载
                if (loadStatus['gridjs-core'] && loadStatus['gridjs-theme']) {
                    logger.info('✅ GridJS核心和主题都已加载成功，准备加载表格');
                    
                    // 延迟以确保样式完全应用
                    setTimeout(() => {
                        const tablesCount = this.loadAllTables();
                    }, 300);
                }
            }
        });
        
        // 监听资源加载失败事件，处理降级方案
        resourceEvents.on(RESOURCE_EVENTS.LOADING_FAILURE, (data) => {
            if (data.resourceId === 'gridjs-core') {
                logger.warn(`⚠️ GridJS核心加载失败，表格功能可能不可用 [来源: ${data.sender || '未知'}]`);
            }
        });
    }

    loadTableResources() {
        if (!window.gridjs) {
            logger.info('正在加载渲染表格所需的资源(当前使用GridJS库)...');
            gridjsLoader.loadGridjsResources()
                .then(() => {
                    // 这里只打印日志，真正的渲染会在事件监听器中触发
                    logger.info('GridJS库加载成功');
                })
                .catch(error => {
                    logger.error('GridJS库加载失败:', error.message);
                });
        }
    }
    
    initIntersectionObserver() {
        try {
            this.observer = new IntersectionObserver(this.onIntersection.bind(this), {
                rootMargin: '100px',
                threshold: 0.1
            });
            
            const tableBlocks = document.querySelectorAll('.table-block');
            logger.info(`找到 ${tableBlocks.length} 个表格块`);
            
            tableBlocks.forEach(block => this.observer.observe(block));
        } catch (error) {
            logger.error('初始化表格懒加载失败:', error.message);
            
            // 降级处理：立即加载所有表格
            document.querySelectorAll('.table-block').forEach(block => this.loadTable(block));
        }
    }

    // 处理表格可见性
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadTable(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }
    
    // 添加GridJS自定义样式
    addInlineStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .notion-table-gridjs {
                margin: 8px 0;
                overflow: auto;
                background: transparent; /* 确保容器背景透明 */
                border: none;
            }
            .notion-table-gridjs .gridjs-wrapper {
                background: transparent; /* 移除wrapper灰色背景 */
                box-shadow: none; /* 移除阴影 */
                border: none; /* 移除边框 */
            }
            .notion-table-gridjs .gridjs-table {
                font-family: inherit;
                border-radius: 4px;
                background: transparent; /* 移除表格背景 */
            }
            .notion-table-gridjs .gridjs-th {
                background-color: #f9f9f9; /* 表头轻微灰色背景 */
                border-color: #e5e7eb; /* 更柔和的边框颜色 */
            }
            .notion-table-gridjs .gridjs-td {
                border-color: #e5e7eb; /* 更柔和的边框颜色 */
            }
            .notion-table-gridjs .gridjs-footer {
                background: transparent; /* 移除底部区域背景 */
                border: none; /* 移除底部边框 */
                box-shadow: none; /* 移除底部阴影 */
                padding: 5px 0 0 0; /* 减少内边距 */
            }
            .notion-table-gridjs .gridjs-pagination {
                justify-content: center;
                background: transparent; /* 移除分页背景 */
                border: none; /* 移除分页边框 */
                margin: 2px 0; /* 减少外边距 */
                padding: 15px 15px 0px 15px; /* 移除内边距 */
            }
            .notion-table-gridjs .gridjs-summary {
                margin: 0 8px 0 0; /* 调整结果摘要的边距 */
            }
            .notion-table-gridjs .gridjs-pagination .gridjs-pages button {
                border-color: #e5e7eb;
                color: #333;
            }
            .notion-table-gridjs .gridjs-pagination .gridjs-pages button:hover {
                background-color: #f5f5f5;
            }
            .notion-table-gridjs .gridjs-pagination .gridjs-pages button.gridjs-currentPage {
                background-color: #f0f0f0;
                font-weight: bold;
            }
            .notion-table-gridjs .gridjs-search {
                margin-bottom: 12px;
                background: transparent; /* 搜索框透明背景 */
            }
            .gridjs-wrapper::-webkit-scrollbar {
                height: 8px;
            }
            .gridjs-wrapper::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            .gridjs-wrapper::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
            }
            .gridjs-wrapper::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 加载所有表格
    loadAllTables() {
        const tableBlocks = document.querySelectorAll('.table-block:not(.processed)');
        logger.info(`找到 ${tableBlocks.length} 个表格块`);
        
        // 确保每个表格能完整渲染
        tableBlocks.forEach(block => {
            this.loadTable(block);
        });
        
        return tableBlocks.length;
    }
    
    // 加载表格
    loadTable(tableBlock) {
        const tableId = this.getTableIdentifier(tableBlock);
        
        // 检查表格是否真的渲染完成，而不仅仅依赖class标记
        if (tableBlock.classList.contains('processed')) {
            // 额外检查表格是否有内容，避免仅标记为processed但实际未渲染的情况
            const hasContent = tableBlock.querySelector('.notion-table-gridjs .gridjs-table') !== null;
            if (hasContent) {
                logger.debug(`${tableId}已完全渲染，跳过重复加载`);
                return;
            } else {
                // 移除processed标记，允许重新渲染
                logger.info(`${tableId}被标记为已处理但内容未渲染，将重新加载`);
                tableBlock.classList.remove('processed');
            }
        }
        
        logger.info(`开始加载${tableId}`);
        this.loadingTables.add(tableBlock);
        
        try {
            // 创建表格容器
            if (!tableBlock.querySelector('.table-container')) {
                const tableContainer = document.createElement('div');
                tableContainer.className = 'table-container';
                tableBlock.innerHTML = '';
                tableBlock.appendChild(tableContainer);
            }

            const tableDataStr = tableBlock.getAttribute('data-table-data');
            const blockId = tableBlock.getAttribute('data-block-id');
            
            if (!tableDataStr) {
                logger.error('表格数据字符串为空');
                return;
            }
            
            const tableData = JSON.parse(tableDataStr);

            // 检查是否有数据
            if (!tableData.rows || tableData.rows.length === 0) {
                // 如果没有数据且有块ID，从API获取
                if (blockId) {
                    this.fetchTableData(tableBlock, blockId, tableData);
                } else {
                    logger.error('表格数据字符串为空');
                    tableBlock.innerHTML = '<div class="table-error">无法加载表格：缺少数据源</div>';
                }
            } else {
                logger.info('表格数据字符串不为空');
                // 有数据，直接渲染
                this.renderGridJSTable(tableBlock, tableData);
            }
        } catch (error) {
            logger.error('加载表格失败:', error.message);
            tableBlock.innerHTML = `<div class="table-error">加载表格失败: ${error.message}</div>`;
        }
    }

    // 从API获取表格数据
    fetchTableData(tableBlock, blockId, tableData) {
        // 防止重复加载同一表格
        if (this.loadingTables.has(blockId)) {
            logger.debug(`表格 ${blockId} 已经在加载中，跳过重复请求`);
            return;
        }
        
        // 标记为正在加载
        this.loadingTables.add(blockId);
        
        // 显示加载状态
        const container = tableBlock.querySelector('.table-container') || tableBlock;
        container.innerHTML = '<div class="table-loading">正在加载表格数据...</div>';
        
        // 构建API URL
        const apiBaseUrl = window.config?.api?.baseUrl || '/api';
        const apiUrl = `${apiBaseUrl}/blocks/${blockId}/children`;
        
        logger.debug('获取表格数据:', blockId.substring(0, 24));
        
        // 保存表头设置
        const hasColumnHeader = tableData.hasColumnHeader;
        const hasRowHeader = tableData.hasRowHeader;
        
        // 设置超时保护
        const timeoutId = setTimeout(() => {
            container.innerHTML = '<div class="table-error">获取表格数据超时</div>';
        }, 10000);
        
        // 获取数据源，添加日志
        const dataSource = tableBlock.getAttribute('data-source');
        // logger.debug(`加载表格数据，源: ${dataSource}`);
        
        // 发起API请求
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`API错误: ${response.status}`);
                return response.json();
            })
            .then(data => {
                clearTimeout(timeoutId);
                const processedData = this.processAPIResponse(data, hasColumnHeader, hasRowHeader);

                logger.info('已获取到表格数据，开始渲染');
                this.renderGridJSTable(tableBlock, processedData);
                this.loadingTables.delete(blockId); // 移除加载标记
                
                // 保存原始数据到dataset属性
                tableBlock.dataset.tableData = JSON.stringify(processedData);
                // logger.debug('表格数据已保存到dataset', processedData);  // 暂时注释掉，但不要删除，调试时使用
            })
            .catch(error => {
                    clearTimeout(timeoutId);
                logger.error('获取表格数据失败:', error.message);
                container.innerHTML = `<div class="table-error">获取表格数据失败: ${error.message}</div>`;
                this.loadingTables.delete(blockId); // 移除加载标记
            });
    }
    
    // 处理API响应数据
    processAPIResponse(apiResponse, hasColumnHeader = false, hasRowHeader = false) {
        const processedData = {
            rows: [],
            hasColumnHeader: hasColumnHeader,
            hasRowHeader: hasRowHeader
        };
        
        if (!apiResponse?.results) return processedData;
        
        // 获取表格行
        const tableRows = apiResponse.results.filter(block => block.type === 'table_row');
        
        // 提取行数据
        tableRows.forEach(row => {
            if (row.table_row?.cells) {
                processedData.rows.push(row.table_row.cells);
            }
        });
        
        logger.debug('获取到' + processedData.rows.length + '行表格数据');
        
        return processedData;
    }
    
    // 内部方法：实际执行GridJS表格渲染
    renderGridJSTable(tableBlock, tableData) {
        // 检查数据有效性
        if (!tableData || !tableData.rows || !tableData.rows.length) {
            logger.warn('表格数据无效或为空', tableData);
            tableBlock.innerHTML = `<div class="table-error">表格数据无效</div>`;
            return;
        }
        
        try {
            // 先检查GridJS是否真的可用
            if (!window.gridjs || typeof window.gridjs.Grid !== 'function') {
                logger.warn('GridJS库尚未可用，稍后重试渲染表格');
                
                // 保存表格数据到dataset，以便后续渲染
                tableBlock.dataset.tableData = JSON.stringify(tableData);
                tableBlock.innerHTML = `<div class="table-loading">正在初始化表格组件...</div>`;
                
                // 延迟重试
                setTimeout(() => {
                    if (window.gridjs && typeof window.gridjs.Grid === 'function') {
                        logger.info('GridJS现在可用，重试渲染表格');
                        this.renderGridJSTable(tableBlock, tableData);
                    }
                }, 1000);
                return;
            }
            
            // 创建GridJS容器
            const gridContainer = document.createElement('div');
            gridContainer.className = 'notion-table-gridjs';
            tableBlock.innerHTML = ''; // 确保容器为空
            tableBlock.appendChild(gridContainer);
            
            // 准备表格数据
            const data = [...tableData.rows];
            
            // 提取表头
            let columns = [];
            if (tableData.hasColumnHeader && data.length > 0) {
                columns = data[0].map((cell, index) => ({
                    name: this.extractPlainText(cell) || `列 ${index + 1}`,
                    sort: true
                }));
                
                data.shift(); // 移除表头行
            }
            
            // 创建GridJS实例
            const grid = new window.gridjs.Grid({
                columns,
                data: data.map(row => row.map(cell => this.extractPlainText(cell))),
                sort: true,
                pagination: {
                    limit: 10,
                    enabled: data.length > 10
                },
                search: data.length > 5,
                resizable: true,
                language: {
                    search: { placeholder: '搜索...' },
                    pagination: {
                        previous: '上一页',
                        next: '下一页',
                        showing: '显示',
                        of: '/',
                        to: '-',
                        results: '条结果'
                    }
                }
            });
            grid.render(gridContainer);
            
            // 标记为已处理前确认渲染成功
            setTimeout(() => {
                // 验证表格是否真的渲染成功
                const renderedTable = tableBlock.querySelector('.gridjs-table');
                if (renderedTable) {
                    logger.debug('表格渲染验证成功，标记为已处理');
                    tableBlock.classList.add('processed');
                } else {
                    logger.warn('表格可能未成功渲染，未标记为已处理');
                    // 不添加processed标记，允许下次重试
                }
                
                // 最后，清除加载状态
                this.loadingTables.delete(tableBlock);
            }, 100); // 短暂延迟确保DOM更新
            
        } catch (error) {
            logger.error('渲染GridJS表格失败:', error.message);
            tableBlock.innerHTML = `<div class="table-error">渲染表格失败: ${error.message}</div>`;
            this.loadingTables.delete(tableBlock); // 确保错误情况下也清除加载状态
        }
    }

    // 因为tableBlock.id是空的，所以通过以下代码获取更有意义的标识符
    getTableIdentifier(tableBlock) {
        // 尝试多种方式获取表格标识
        const blockId = tableBlock.getAttribute('data-block-id');
        const dataSource = tableBlock.getAttribute('data-source');
        const tableIndex = Array.from(document.querySelectorAll('.table-block')).indexOf(tableBlock);
        
        // 返回最有意义的标识方式
        if (blockId) {
            return `表格(ID:${blockId.substring(0, 8)}...)`;
        } else if (dataSource) {
            return `表格(源:${dataSource})`;
        } else {
            return `表格#${tableIndex + 1}`;
        }
    }
    
    // 提取纯文本
    extractPlainText(cell) {
        if (!cell) return '';
        if (typeof cell === 'string') return cell;
        
        if (Array.isArray(cell)) {
            return cell.map(item => 
                item.plain_text || (item.text?.content) || ''
            ).join('');
        }
        
        if (typeof cell === 'object' && cell !== null) {
            return cell.plain_text || (cell.text?.content) || '';
        }
        
        return String(cell);
    }

}

// 创建并导出单例
export const tableLazyLoader = new TableLazyLoader();
export default tableLazyLoader;