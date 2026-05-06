import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Info, CheckCircle, X, Skull, Heart, Zap } from 'lucide-react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'item' | 'stat' | 'combat';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface NotificationProps {
  notification: NotificationData;
  onClose: (id: string) => void;
}

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return 'bg-green-900/90 border-green-500 text-green-100';
    case 'warning':
      return 'bg-orange-900/90 border-orange-500 text-orange-100';
    case 'error':
      return 'bg-red-900/90 border-red-500 text-red-100';
    case 'item':
      return 'bg-purple-900/90 border-purple-500 text-purple-100';
    case 'stat':
      return 'bg-blue-900/90 border-blue-500 text-blue-100';
    case 'combat':
      return 'bg-red-900/90 border-red-600 text-red-100 animate-shake';
    default:
      return 'bg-zinc-800/90 border-zinc-600 text-zinc-100';
  }
};

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={18} className="text-green-400" />;
    case 'warning':
      return <AlertTriangle size={18} className="text-orange-400" />;
    case 'error':
      return <Skull size={18} className="text-red-400" />;
    case 'item':
      return <Package size={18} className="text-purple-400" />;
    case 'stat':
      return <Heart size={18} className="text-blue-400" />;
    case 'combat':
      return <Zap size={18} className="text-red-400 animate-pulse" />;
    default:
      return <Info size={18} className="text-zinc-400" />;
  }
};

const NotificationItem: React.FC<NotificationProps> = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = notification.duration || 3000;
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onClose(notification.id), duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [notification, onClose]);

  return (
    <div
      className={`
        pointer-events-auto flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-300 transform
        ${getNotificationStyles(notification.type)}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-notification-pop
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {notification.icon || getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{notification.title}</p>
        {notification.message && (
          <p className="text-xs opacity-80 mt-0.5">{notification.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// 通知管理器Hook
export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便捷方法
  const notify = {
    info: (title: string, message?: string) => 
      addNotification({ type: 'info', title, message }),
    success: (title: string, message?: string) => 
      addNotification({ type: 'success', title, message }),
    warning: (title: string, message?: string) => 
      addNotification({ type: 'warning', title, message }),
    error: (title: string, message?: string) => 
      addNotification({ type: 'error', title, message }),
    item: (title: string, message?: string) => 
      addNotification({ type: 'item', title, message, duration: 4000 }),
    stat: (title: string, message?: string) => 
      addNotification({ type: 'stat', title, message, duration: 2000 }),
    combat: (title: string, message?: string) => 
      addNotification({ type: 'combat', title, message, duration: 4000 }),
  };

  return { notifications, addNotification, removeNotification, clearAll, notify };
}

// 通知容器组件
interface NotificationContainerProps {
  notifications: NotificationData[];
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onClose 
}) => {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm px-2 sm:px-0 pointer-events-none">
      {notifications.slice(-5).map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
