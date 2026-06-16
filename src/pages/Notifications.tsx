import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Trash2, Filter, Download, Clock, AlertCircle } from 'lucide-react';
import { Card, Button, StatusBadge } from '../components/Card.js';
import { useNotificationStore } from '../store/notificationStore.js';
import type { Notification } from '../../shared/types.js';

const typeLabels: Record<string, string> = {
  project: '项目通知',
  work: '作品通知',
  mixing: '混音任务',
  master: '母带通知',
  royalty: '版税结算',
  system: '系统通知'
};

const typeColors: Record<string, string> = {
  project: 'bg-violet-500/20 text-violet-400',
  work: 'bg-cyan-500/20 text-cyan-400',
  mixing: 'bg-blue-500/20 text-blue-400',
  master: 'bg-emerald-500/20 text-emerald-400',
  royalty: 'bg-amber-500/20 text-amber-400',
  system: 'bg-slate-500/20 text-slate-400'
};

const typeIcons: Record<string, string> = {
  project: '📁',
  work: '🎵',
  mixing: '🎧',
  master: '📀',
  royalty: '💰',
  system: '🔔'
};

export const Notifications: React.FC = () => {
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [filter, setFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const handleMarkSelectedAsRead = () => {
    selectedIds.forEach(id => markAsRead(id));
    setSelectedIds([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  const filters = [
    { value: 'all', label: '全部' },
    { value: 'unread', label: '未读' },
    { value: 'project', label: '项目' },
    { value: 'work', label: '作品' },
    { value: 'mixing', label: '混音' },
    { value: 'master', label: '母带' },
    { value: 'royalty', label: '版税' },
    { value: 'system', label: '系统' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">消息中心</h1>
          <p className="text-slate-400 mt-1">
            您有 <span className="text-violet-400 font-medium">{unreadCount}</span> 条未读消息
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            全部已读
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkSelectedAsRead}
            disabled={selectedIds.length === 0}
            className="gap-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            标记已读 ({selectedIds.length})
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-2 self-center" />
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {filteredNotifications.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/30 rounded-xl">
          <input
            type="checkbox"
            checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
            onChange={selectAll}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-slate-400">
            已选择 {selectedIds.length} / {filteredNotifications.length} 条
          </span>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400">加载消息中...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-medium text-white mb-2">暂无消息</h3>
            <p className="text-slate-400">
              {filter === 'all' ? '您还没有收到任何消息' : '没有符合筛选条件的消息'}
            </p>
          </Card>
        ) : (
          filteredNotifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNotificationClick(notification)}
              className={`relative p-4 rounded-2xl border transition-all cursor-pointer ${
                !notification.isRead
                  ? 'bg-violet-500/5 border-violet-500/30 hover:bg-violet-500/10'
                  : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(notification.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelect(notification.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500"
                />

                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center text-2xl">
                  {typeIcons[notification.type] || '📢'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${!notification.isRead ? 'text-white' : 'text-slate-300'}`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[notification.type] || typeColors.system}`}>
                        {typeLabels[notification.type] || '其他'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.createdAt)}
                      </span>
                      {notification.relatedId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                    {notification.content}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
