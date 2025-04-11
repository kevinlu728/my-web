/**
 * @file tableLazyLoader.js
 * @description 表格懒加载工具，实现表格的延迟加载和交互功能
 * @author 陆凯
 * @version 1.1.0
 * @created 2024-03-09
 * @updated 2025-04-11
 * 
 * 该模块实现了表格的懒加载功能，提高页面加载性能：
 * - 使用IntersectionObserver监测表格可见性
 * - 表格进入视口时才加载和渲染
 * - 支持表格排序功能
 * - 支持从API动态获取表格数据
 * - 处理各种错误情况和边缘情况
 * 
 * 主要方法：
 * - loadTable: 加载表格数据并渲染
 * - renderTable: 将表格数据渲染为HTML
 * - processAllTables: 处理页面中的所有表格
 * - addTableSorting: 添加表格排序功能
 * 
 * 导出单例tableLazyLoader供其他模块使用。
 */

import logger from '../utils/logger.js';
import { gridjsLoader } from '../resource/gridjsLoader.js';

/**
 * 表格懒加载器 - 使用GridJS提供高级表格功能
 */
class TableLazyLoader {
    constructor() {
        this.observer = null;
        this.loadingTables = new Set(); // 跟踪正在加载的表格
        this.init();
        this.addGridJSStyles();
    }
    
    // 初始化观察器
    init() {
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
    
    // 添加GridJS自定义样式
    addGridJSStyles() {
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
    
    // 处理表格可见性
    onIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadTable(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    // 加载表格
    loadTable(tableBlock) {
        try {
            const tableDataStr = tableBlock.getAttribute('data-table-data');
            const blockId = tableBlock.getAttribute('data-block-id');
            
            if (!tableDataStr) {
                logger.error('表格数据字符串为空');
                return;
            }
            
            const tableData = JSON.parse(tableDataStr);
            
            // 创建表格容器
            if (!tableBlock.querySelector('.table-container')) {
                const tableContainer = document.createElement('div');
                tableContainer.className = 'table-container';
                tableBlock.innerHTML = '';
                tableBlock.appendChild(tableContainer);
            }
            
            // 检查是否有数据
            if (!tableData.rows || tableData.rows.length === 0) {
                // 如果没有数据且有块ID，从API获取
                if (blockId) {
                    this.fetchTableData(tableBlock, blockId, tableData);
                } else {
                    tableBlock.innerHTML = '<div class="table-error">无法加载表格：缺少数据源</div>';
                }
            } else {
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
        
        logger.info('从API获取表格数据:', blockId);
        
        // 保存表头设置
        const hasColumnHeader = tableData.hasColumnHeader;
        const hasRowHeader = tableData.hasRowHeader;
        
        // 设置超时保护
        const timeoutId = setTimeout(() => {
            container.innerHTML = '<div class="table-error">获取表格数据超时</div>';
        }, 10000);
        
        // 发起API请求
        fetch(apiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`API错误: ${response.status}`);
                return response.json();
            })
            .then(data => {
                clearTimeout(timeoutId);
                const processedData = this.processAPIResponse(data, hasColumnHeader, hasRowHeader);
                this.renderGridJSTable(tableBlock, processedData);
                this.loadingTables.delete(blockId); // 移除加载标记
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
        
        logger.info('获取到' + processedData.rows.length + '行表格数据');
        
        return processedData;
    }
    
    // 使用GridJS渲染表格
    renderGridJSTable(tableBlock, tableData) {
        try {
            // 确保GridJS库已加载
            if (!window.gridjs) {
                logger.info('正在加载GridJS库...');
                gridjsLoader.loadGridjsResources()
                    .then(() => this.renderGridJSTableInternal(tableBlock, tableData))
                    .catch(error => {
                        logger.error('加载GridJS资源失败:', error.message);
                        tableBlock.innerHTML = `<div class="table-error">加载表格组件失败</div>`;
                    });
                return;
            }
            
            this.renderGridJSTableInternal(tableBlock, tableData);
        } catch (error) {
            logger.error('GridJS表格渲染失败:', error.message);
            tableBlock.innerHTML = `<div class="table-error">表格渲染失败: ${error.message}</div>`;
        }
    }
    
    // 内部方法：实际执行GridJS表格渲染
    renderGridJSTableInternal(tableBlock, tableData) {
        const container = tableBlock.querySelector('.table-container') || tableBlock;
        container.innerHTML = '';
        
        // 创建GridJS容器
        const gridContainer = document.createElement('div');
        gridContainer.className = 'notion-table-gridjs';
        container.appendChild(gridContainer);
        
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
        new gridjs.Grid({
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
        }).render(gridContainer);
        
        // 标记为已处理
        tableBlock.classList.add('processed');
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
    
    // 处理所有表格
    processAllTables() {
        const tableBlocks = document.querySelectorAll('.table-block:not(.processed)');
        logger.info(`找到 ${tableBlocks.length} 个表格块`);
        
        tableBlocks.forEach(block => this.loadTable(block));
        return tableBlocks.length;
    }
}

// 创建并导出单例
export const tableLazyLoader = new TableLazyLoader();
export default tableLazyLoader;