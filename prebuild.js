/**
 * 预构建脚本，确保依赖关系正确处理
 * 特别针对Vercel部署优化
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('执行预构建脚本...');

// 创建API依赖目录
const apiDir = path.join(__dirname, 'api', 'node_modules');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
  console.log('✅ 创建API依赖目录:', apiDir);
}

// 确保API目录中有package.json
const apiPackageJsonPath = path.join(__dirname, 'api', 'package.json');
if (!fs.existsSync(apiPackageJsonPath)) {
  const apiPackageJson = {
    "dependencies": {
      "whatwg-url": "5.0.0",
      "webidl-conversions": "3.0.1", 
      "tr46": "0.0.3"
    }
  };
  fs.writeFileSync(apiPackageJsonPath, JSON.stringify(apiPackageJson, null, 2));
  console.log('✅ 创建API package.json');
}

// 运行API目录的npm install
try {
  console.log('在API目录安装依赖...');
  execSync('cd api && npm install', { stdio: 'inherit' });
  console.log('✅ API依赖安装完成');
} catch (error) {
  console.error('❌ API依赖安装失败:', error.message);
}

// 特别处理：直接将依赖模块复制到@notionhq/client/node_modules/node-fetch/node_modules目录
function copyDependencyToNestedLocation() {
  try {
    console.log('开始特别处理嵌套依赖...');
    
    // 安装核心依赖到根目录
    console.log('确保核心依赖在根目录安装...');
    execSync('npm install whatwg-url@5.0.0 webidl-conversions@3.0.1 tr46@0.0.3 --no-save', { stdio: 'inherit' });
    
    // 源目录
    const whatwgUrlSrc = path.join(__dirname, 'node_modules', 'whatwg-url');
    const webidlConversionsSrc = path.join(__dirname, 'node_modules', 'webidl-conversions');
    const tr46Src = path.join(__dirname, 'node_modules', 'tr46');
    
    if (!fs.existsSync(whatwgUrlSrc)) {
      console.error('❌ 源 whatwg-url 模块不存在！');
      return false;
    }
    
    // 获取@notionhq/client路径
    const notionClientPath = path.join(__dirname, 'node_modules', '@notionhq', 'client');
    if (!fs.existsSync(notionClientPath)) {
      console.error('❌ @notionhq/client 模块不存在！');
      return false;
    }
    
    // 目标路径1：@notionhq/client/node_modules/node-fetch/node_modules/
    const targetPath1 = path.join(notionClientPath, 'node_modules', 'node-fetch', 'node_modules');
    // 目标路径2：node_modules/node-fetch/node_modules/
    const targetPath2 = path.join(__dirname, 'node_modules', 'node-fetch', 'node_modules');
    // 目标路径3：根node_modules/@notionhq/client/node_modules/
    const targetPath3 = path.join(notionClientPath, 'node_modules');
    
    // 确保目标目录存在
    [targetPath1, targetPath2, targetPath3].forEach(targetPath => {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`✅ 创建目录: ${targetPath}`);
      }
    });
    
    // 复制whatwg-url到所有目标位置
    [targetPath1, targetPath2, targetPath3].forEach(targetPath => {
      const whatwgUrlTarget = path.join(targetPath, 'whatwg-url');
      const webidlConversionsTarget = path.join(targetPath, 'webidl-conversions');
      const tr46Target = path.join(targetPath, 'tr46');
      
      if (!fs.existsSync(whatwgUrlTarget)) {
        console.log(`复制 whatwg-url 到: ${whatwgUrlTarget}`);
        fs.cpSync(whatwgUrlSrc, whatwgUrlTarget, { recursive: true });
      }
      
      if (!fs.existsSync(webidlConversionsTarget)) {
        console.log(`复制 webidl-conversions 到: ${webidlConversionsTarget}`);
        fs.cpSync(webidlConversionsSrc, webidlConversionsTarget, { recursive: true });
      }
      
      if (!fs.existsSync(tr46Target)) {
        console.log(`复制 tr46 到: ${tr46Target}`);
        fs.cpSync(tr46Src, tr46Target, { recursive: true });
      }
    });
    
    console.log('✅ 嵌套依赖复制完成');
    return true;
  } catch (error) {
    console.error('❌ 复制嵌套依赖失败:', error);
    return false;
  }
}

// 创建必要的软链接
function createSymlinks() {
  try {
    console.log('创建软链接以确保依赖可访问...');
    
    // 从node_modules根目录到notion客户端node_modules目录的软链接
    const rootModulesPath = path.join(__dirname, 'node_modules');
    const notionClientNodeModulesPath = path.join(rootModulesPath, '@notionhq', 'client', 'node_modules');
    
    if (!fs.existsSync(notionClientNodeModulesPath)) {
      fs.mkdirSync(notionClientNodeModulesPath, { recursive: true });
    }
    
    // 需要链接的模块
    const modulesToLink = ['whatwg-url', 'webidl-conversions', 'tr46'];
    
    modulesToLink.forEach(moduleName => {
      const sourcePath = path.join(rootModulesPath, moduleName);
      const targetPath = path.join(notionClientNodeModulesPath, moduleName);
      
      if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
        try {
          // 如果系统支持软链接，创建软链接
          fs.symlinkSync(sourcePath, targetPath, 'junction');
          console.log(`✅ 创建软链接: ${targetPath} -> ${sourcePath}`);
        } catch (err) {
          // 如果软链接失败，复制整个目录
          fs.cpSync(sourcePath, targetPath, { recursive: true });
          console.log(`✅ 无法创建软链接，复制目录: ${targetPath}`);
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ 创建软链接失败:', error);
    return false;
  }
}

// 特别处理嵌套依赖
const dependenciesResult = copyDependencyToNestedLocation();
console.log('嵌套依赖处理结果:', dependenciesResult ? '成功' : '失败');

// 创建软链接
const symlinksResult = createSymlinks();
console.log('软链接创建结果:', symlinksResult ? '成功' : '失败');

// 确保根目录依赖安装
try {
  console.log('检查核心依赖...');
  
  // 确保whatwg-url依赖安装
  try {
    require.resolve('whatwg-url');
    console.log('✅ whatwg-url已安装');
  } catch (err) {
    console.log('安装whatwg-url 5.0.0...');
    execSync('npm install whatwg-url@5.0.0 --no-save', { stdio: 'inherit' });
  }
  
  // 确保webidl-conversions依赖安装
  try {
    require.resolve('webidl-conversions');
    console.log('✅ webidl-conversions已安装');
  } catch (err) {
    console.log('安装webidl-conversions 3.0.1...');
    execSync('npm install webidl-conversions@3.0.1 --no-save', { stdio: 'inherit' });
  }
  
  // 确保tr46依赖安装
  try {
    require.resolve('tr46');
    console.log('✅ tr46已安装');
  } catch (err) {
    console.log('安装tr46...');
    execSync('npm install tr46@0.0.3 --no-save', { stdio: 'inherit' });
  }
  
  // 检查@notionhq/client的node_modules文件夹是否存在
  const notionModulePath = path.join(__dirname, 'node_modules', '@notionhq', 'client');
  if (fs.existsSync(notionModulePath)) {
    console.log('✅ @notionhq/client模块已存在');
    
    // 找到node-fetch的位置
    let nodeFetchPath;
    try {
      nodeFetchPath = path.dirname(require.resolve('node-fetch'));
      console.log(`✅ node-fetch位于: ${nodeFetchPath}`);
    } catch (err) {
      console.log('⚠️ 找不到node-fetch，尝试安装...');
      execSync('npm install node-fetch@2.6.7 --no-save', { stdio: 'inherit' });
      nodeFetchPath = path.dirname(require.resolve('node-fetch'));
    }
    
    // 额外处理：确保node-fetch目录中有node_modules并包含whatwg-url
    const nodeFetchNodeModulesPath = path.join(nodeFetchPath, 'node_modules');
    if (!fs.existsSync(nodeFetchNodeModulesPath)) {
      fs.mkdirSync(nodeFetchNodeModulesPath, { recursive: true });
      console.log(`✅ 创建node-fetch/node_modules目录`);
    }
    
    // 复制whatwg-url到node-fetch/node_modules
    const whatwgUrlSrc = path.join(__dirname, 'node_modules', 'whatwg-url');
    const whatwgUrlDest = path.join(nodeFetchNodeModulesPath, 'whatwg-url');
    if (fs.existsSync(whatwgUrlSrc) && !fs.existsSync(whatwgUrlDest)) {
      fs.cpSync(whatwgUrlSrc, whatwgUrlDest, { recursive: true });
      console.log(`✅ 复制whatwg-url到node-fetch/node_modules`);
    }
    
    console.log('✅ 依赖处理完成');
  } else {
    console.error('❌ 找不到@notionhq/client模块');
  }
} catch (error) {
  console.error('❌ 预构建脚本出错:', error);
  process.exit(1);
}

// 最后尝试检查node-fetch的依赖路径
try {
  console.log('检查node-fetch依赖路径...');
  const nodeFetchPath = require.resolve('node-fetch');
  console.log(`node-fetch位于: ${nodeFetchPath}`);
  
  // 输出当前目录结构
  const rootNodeModules = path.join(__dirname, 'node_modules');
  if (fs.existsSync(rootNodeModules)) {
    console.log(`根node_modules目录存在: ${rootNodeModules}`);
    
    // 检查whatwg-url位置
    const whatwgUrlPath = path.join(rootNodeModules, 'whatwg-url');
    if (fs.existsSync(whatwgUrlPath)) {
      console.log(`根whatwg-url存在: ${whatwgUrlPath}`);
    }
    
    // 检查@notionhq/client/node_modules/node-fetch/node_modules
    const nestedFetchModulesPath = path.join(rootNodeModules, '@notionhq', 'client', 'node_modules', 'node-fetch', 'node_modules');
    if (fs.existsSync(nestedFetchModulesPath)) {
      console.log(`嵌套node-fetch/node_modules存在: ${nestedFetchModulesPath}`);
      
      // 检查whatwg-url
      const nestedWhatwgUrlPath = path.join(nestedFetchModulesPath, 'whatwg-url');
      if (fs.existsSync(nestedWhatwgUrlPath)) {
        console.log(`嵌套whatwg-url存在: ${nestedWhatwgUrlPath}`);
      } else {
        console.log(`❌ 嵌套whatwg-url不存在!`);
      }
    } else {
      console.log(`❌ 嵌套node-fetch/node_modules不存在!`);
    }
  }
} catch (error) {
  console.log(`检查node-fetch路径时出错: ${error.message}`);
}

console.log('预构建脚本执行完成');