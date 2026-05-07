import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { addCrashLog, installGlobalCrashHandlers } from './utils/crashLogger';
import { logger } from './utils/logger';

installGlobalCrashHandlers();

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    addCrashLog({
      type: 'react',
      message: err.message || 'React 初始化失败',
      stack: err.stack,
      source: 'main.tsx:createRoot',
      detail: error,
    });
    logger.core.error('React 初始化失败', error);
    container.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#09090b;color:#fafafa;padding:24px;font-family:system-ui,sans-serif;">
        <div style="max-width:720px;width:100%;background:#18181b;border:1px solid #3f3f46;border-radius:16px;padding:24px;">
          <div style="font-size:28px;margin-bottom:12px;">⚠️ 游戏初始化失败</div>
          <div style="color:#f59e0b;margin-bottom:12px;">错误信息：${err.message || '未知错误'}</div>
          <div style="color:#a1a1aa;line-height:1.7;font-size:14px;">崩溃原因已自动记录到本地日志中。你可以重新加载，或进入后台查看崩溃日志。</div>
          <button onclick="window.location.reload()" style="margin-top:16px;background:#d97706;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;">重新加载</button>
        </div>
      </div>
    `;
  }
} else {
  addCrashLog({
    type: 'error',
    message: 'Root element not found',
    source: 'main.tsx:getElementById(root)',
  });
  logger.core.error('Root element not found');
}
