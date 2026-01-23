/**
 * Mermaid 运行时工具
 * 用于在 iframe 中预览 Mermaid 图表
 *
 * @module utils/compiler/mermaidRuntime
 */

// 使用 Mermaid 10.x（最新稳定版）
const MERMAID_VERSION = '10.9.1'

/**
 * Mermaid CDN URL - 使用 unpkg 作为备用 CDN
 */
const MERMAID_CDN = `https://unpkg.com/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`

/**
 * 创建 Mermaid 预览 HTML
 * @param code - Mermaid 图表代码
 * @returns 完整的 HTML 文档
 */
export function createMermaidPreview(code: string): string {
  // 清理代码内容
  const cleanedCode = code.trim()

  // HTML 转义以防止 XSS
  const escapedCode = escapeHtml(cleanedCode)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #f5f5f5;
      padding: 20px;
    }
    #mermaid-container {
      width: 100%;
      max-width: 1200px;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    /* Mermaid SVG 样式 */
    .mermaid {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    /* 深色模式支持 */
    @media (prefers-color-scheme: dark) {
      body { background: #1a1a1a; }
      #mermaid-container { background: #2d2d2d; }
    }
    /* 加载提示 */
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    /* 错误提示 */
    .error {
      color: #e74c3c;
      padding: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div id="mermaid-container">
    <div class="loading">正在加载 Mermaid...</div>
    <pre class="mermaid" style="display:none;">${escapedCode}</pre>
  </div>

  <script>
    (function() {
      console.log('[Mermaid Preview] 开始初始化');

      // 加载 Mermaid
      const script = document.createElement('script');
      script.src = '${MERMAID_CDN}';
      script.onload = function() {
        console.log('[Mermaid Preview] CDN 加载成功');

        try {
          if (typeof mermaid === 'undefined') {
            throw new Error('mermaid 对象未定义');
          }

          console.log('[Mermaid Preview] 开始初始化 mermaid');
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            logLevel: 'debug',
            themeVariables: {
              fontSize: '16px'
            }
          });

          console.log('[Mermaid Preview] 开始渲染图表');
          const element = document.querySelector('.mermaid');

          // 显示 mermaid 元素
          element.style.display = 'block';

          // 移除加载提示
          const loading = document.querySelector('.loading');
          if (loading) loading.remove();

          // 渲染
          mermaid.init(undefined, element).then(function(result) {
            console.log('[Mermaid Preview] 渲染成功', result);
          }).catch(function(error) {
            console.error('[Mermaid Preview] 渲染失败', error);
            showError('渲染失败: ' + error.message);
          });

        } catch (error) {
          console.error('[Mermaid Preview] 初始化错误', error);
          showError('初始化失败: ' + error.message);
        }
      };

      script.onerror = function() {
        console.error('[Mermaid Preview] CDN 加载失败');
        showError('Mermaid 库加载失败，请检查网络连接或刷新页面重试');
      };

      function showError(message) {
        const container = document.getElementById('mermaid-container');
        container.innerHTML = '<div class="error">' + message + '</div>';
      }

      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`
}

/**
 * 创建 Mermaid 错误预览 HTML
 * @param error - 错误信息
 * @returns 包含错误显示的 HTML
 */
export function createMermaidErrorPreview(error: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .error-container {
      max-width: 600px;
      background: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #ff6b6b;
    }
    .error-title {
      color: #ff6b6b;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .error-message {
      color: #ccc;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-title">Mermaid 图表渲染错误</div>
    <div class="error-message">${escapeHtml(error)}</div>
  </div>
</body>
</html>`
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 检查代码是否为 Mermaid 图表
 */
export function isMermaidChart(code: string): boolean {
  const mermaidPatterns = [
    /graph\s+(TD|LR|BT|RL)/,
    /sequenceDiagram/,
    /classDiagram/,
    /stateDiagram/,
    /erDiagram/,
    /pie/,
    /gantt/,
    /gitGraph/,
    /mindmap/,
    /timeline/,
    /sankey/,
    /block/,
    /flowchart/,
  ]

  return mermaidPatterns.some(pattern => pattern.test(code))
}

/**
 * 获取 Mermaid CDN URL
 */
export function getMermaidCdnUrl() {
  return MERMAID_CDN
}
