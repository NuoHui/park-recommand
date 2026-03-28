#!/usr/bin/env node

/**
 * 编译后处理脚本：转换 TypeScript 路径别名为实际相对路径
 */

const fs = require('fs');
const path = require('path');

// 路径别名映射 - 从 dist/ 文件指向 dist/ 中的文件
const pathMap = {
  '@/': './',
  '@utils/': './utils/',
  '@services/': './services/',
  '@types/': './types/',
  '@cli/': './cli/',
  '@dialogue/': './dialogue/',
  '@llm/': './llm/',
  '@map/': './map/',
  '@cache/': './cache/',
  '@config/': './config/',
};

/**
 * 转换单个文件中的导入语句
 */
function transformFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 获取文件相对于 dist 的深度
  const distDir = path.join(__dirname, '..', 'dist');
  const relativeFromDist = path.relative(distDir, filePath);
  const depth = relativeFromDist.split(path.sep).length - 1;

  // 首先处理路径别名转换
  for (const [alias, baseRelativePath] of Object.entries(pathMap)) {
    // 匹配所有 import/export 语句中的别名
    const regex = new RegExp(`(['"])${alias.replace(/\//g, '\\/')}([^'"]+)(['"])`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, (match, quote1, importPath, quote2) => {
        // 计算到 dist 根目录需要的 ../
        let upDirs = '';
        for (let i = 0; i < depth; i++) {
          upDirs += '../';
        }
        
        // 构建完整路径
        let fullPath = upDirs + baseRelativePath + importPath;
        
        // 规范化路径（移除多余的 ..)
        fullPath = path.normalize(fullPath).replace(/\\/g, '/');
        
        // 确保以 ./ 开头（对于相对导入）
        if (!fullPath.startsWith('.')) {
          fullPath = './' + fullPath;
        }
        
        // 添加 .js 扩展名
        const withExtension = fullPath.endsWith('.js') ? fullPath : fullPath + '.js';
        return `${quote1}${withExtension}${quote2}`;
      });
      
      modified = true;
    }
  }
  
  // 然后处理所有相对导入，添加 .js 扩展名（如果没有）
  const relativeImportRegex = /(['"])(\.\.?\/[^'"]+)(['"])/g;
  if (relativeImportRegex.test(content)) {
    content = content.replace(relativeImportRegex, (match, quote1, importPath, quote2) => {
      // 如果不以 .js 结尾，添加 .js
      if (!importPath.endsWith('.js')) {
        return `${quote1}${importPath}.js${quote2}`;
      }
      return match;
    });
    
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ 已处理: ${path.relative(process.cwd(), filePath)}`);
  }

  return modified;
}

/**
 * 递归处理目录
 */
function processDir(dir) {
  const files = fs.readdirSync(dir);
  let count = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      count += processDir(filePath);
    } else if (file.endsWith('.js')) {
      if (transformFile(filePath)) {
        count++;
      }
    }
  }
  
  return count;
}

/**
 * 主函数
 */
function main() {
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.error(`dist 目录不存在: ${distDir}`);
    process.exit(1);
  }

  const count = processDir(distDir);
  console.log(`\n✅ 完成：共处理 ${count} 个文件`);
}

main();
