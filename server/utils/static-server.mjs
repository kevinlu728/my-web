/**
 * @file static-server.mjs
 * @description 静态文件服务器配置模块，负责设置静态资源的服务规则
 * @author 陆凯
 * @created 2024-03-09
 * @updated 2024-03-10
 */

// 静态文件服务配置
import express from 'express';
import path from 'path';

/**
 * 配置静态文件服务
 * @param {Express} app - Express应用实例
 * @param {string} rootDir - 项目根目录路径
 */
export function configureStaticServer(app, rootDir) {
  // 配置静态文件服务
  app.use(express.static(rootDir, {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.css') {
        res.setHeader('Content-Type', 'text/css');
      }
      if (path.extname(filePath) === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // 特别为 styles 目录添加静态文件服务
  app.use('/styles', express.static(path.join(rootDir, 'styles'), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.css') {
        res.setHeader('Content-Type', 'text/css');
      }
    }
  }));

  // 为 scripts 目录添加静态文件服务
  app.use('/scripts', express.static(path.join(rootDir, 'scripts'), {
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.js') {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // 为 assets 目录添加静态文件服务
  app.use('/assets', express.static(path.join(rootDir, 'assets')));

  console.log('静态文件服务已配置');
} 