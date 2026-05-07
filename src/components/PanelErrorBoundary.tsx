/**
 * PanelErrorBoundary — 面板级错误边界
 * 每个面板独立捕获异常，崩溃时显示紧凑降级UI，不影响其他面板
 */
import React from 'react';
import { addCrashLog } from '../utils/crashLogger';
import { logger } from '../utils/logger';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

interface PanelErrorBoundaryProps {
  /** 面板名称（用于日志和UI显示） */
  panelName: string;
  /** 降级UI的自定义class */
  className?: string;
  /** 是否显示为紧凑模式（仅图标+提示文字） */
  compact?: boolean;
  /** 自定义降级渲染（可选） */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  children: React.ReactNode;
}

interface PanelErrorState {
  hasError: boolean;
  error: Error | null;
  expanded: boolean;
}

export class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, expanded: false };
  }

  static getDerivedStateFromError(error: Error): Partial<PanelErrorState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    addCrashLog({
      type: 'react',
      message: `[${this.props.panelName}] ${error?.message || '组件渲染失败'}`,
      stack: error?.stack,
      source: `PanelErrorBoundary:${this.props.panelName}`,
      detail: info,
    });
    logger.core.error(`PanelErrorBoundary [${this.props.panelName}] 捕获异常`, error.message);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, expanded: false });
  };

  toggleExpanded = () => {
    this.setState(prev => ({ expanded: !prev.expanded }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // 自定义降级渲染
    if (this.props.fallback && this.state.error) {
      return this.props.fallback(this.state.error, this.handleReset);
    }

    const { panelName, compact, className } = this.props;
    const errorMsg = this.state.error?.message || '未知错误';

    // 紧凑模式：仅显示小图标+提示
    if (compact) {
      return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-900/30 text-red-400 text-xs ${className || ''}`}>
          <AlertTriangle size={14} className="shrink-0" />
          <span className="truncate">「{panelName}」加载失败</span>
          <button
            onClick={this.handleReset}
            className="ml-auto px-2 py-0.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 transition-colors flex items-center gap-1"
            title="重试加载"
          >
            <RefreshCw size={11} />重试
          </button>
        </div>
      );
    }

    // 完整降级面板
    return (
      <div className={`rounded-xl border border-red-900/30 bg-zinc-950/90 backdrop-blur-sm overflow-hidden ${className || ''}`}>
        {/* 标题栏 */}
        <button
          onClick={this.toggleExpanded}
          className="w-full flex items-center gap-2 px-4 py-3 bg-red-950/20 hover:bg-red-950/30 transition-colors text-left"
        >
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span className="text-red-300 text-sm font-medium truncate flex-1">
            「{panelName}」面板出现异常
          </span>
          {this.state.expanded ? (
            <ChevronDown size={14} className="text-red-500 shrink-0" />
          ) : (
            <ChevronRight size={14} className="text-red-500 shrink-0" />
          )}
        </button>

        {/* 错误详情（可展开） */}
        {this.state.expanded && (
          <div className="px-4 py-3 space-y-3 border-t border-red-900/20">
            <div className="text-xs text-zinc-400 leading-relaxed">
              <p className="text-red-400/80 mb-1">错误信息：</p>
              <p className="font-mono text-zinc-500 break-all">{errorMsg}</p>
            </div>
            <div className="text-xs text-zinc-500">
              此面板出错不会影响其他面板的正常使用。你可以尝试：
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-600">
                <li>点击下方「重试」按钮重新加载此面板</li>
                <li>切换到其他面板继续操作</li>
                <li>如果问题持续，请刷新页面（Ctrl+F5）</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700/80 hover:bg-amber-600/80 text-white text-xs transition-colors"
              >
                <RefreshCw size={12} />重试加载
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs transition-colors"
              >
                刷新页面
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
