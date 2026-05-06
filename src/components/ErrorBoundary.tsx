import React from 'react';
import { addCrashLog } from '../utils/crashLogger';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || '未知运行错误'
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    addCrashLog({
      type: 'react',
      message: error?.message || 'React 组件渲染失败',
      stack: error?.stack,
      source: 'ErrorBoundary',
      detail: info,
    });
    console.error('[App ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#09090b',
          color: '#e4e4e7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '720px',
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚠️ 项目运行出错</div>
            <div style={{ color: '#f59e0b', marginBottom: '12px' }}>错误信息：{this.state.message}</div>
            <div style={{ color: '#a1a1aa', lineHeight: 1.7, fontSize: '14px', marginBottom: '16px' }}>
              崩溃原因已经自动记录到了本地日志。你可以先尝试：
              <br />1. 强制刷新页面（Ctrl+F5）
              <br />2. 清理浏览器缓存后重试
              <br />3. 打开后台“崩溃日志”页面查看详细信息
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                cursor: 'pointer'
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
