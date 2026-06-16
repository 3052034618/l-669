import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FolderOpen,
  Music,
  Headphones,
  DollarSign,
  Settings,
  Bell,
  LogOut,
  Mic,
  FileAudio,
  Users,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { useUIStore } from '../store/uiStore.js';
import type { UserRole } from '../../shared/types.js';

const roleMenuItems: Record<UserRole, { to: string; icon: React.ElementType; label: string }[]> = {
  producer: [
    { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { to: '/projects', icon: FolderOpen, label: '项目管理' },
    { to: '/works', icon: Music, label: '作品管理' },
    { to: '/mixing', icon: Headphones, label: '混音任务' },
    { to: '/royalty', icon: DollarSign, label: '版税结算' },
    { to: '/notifications', icon: Bell, label: '消息中心' }
  ],
  engineer: [
    { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { to: '/mixing', icon: Headphones, label: '混音任务' },
    { to: '/mastering', icon: FileAudio, label: '母带上传' },
    { to: '/royalty', icon: DollarSign, label: '版税结算' },
    { to: '/notifications', icon: Bell, label: '消息中心' }
  ],
  songwriter: [
    { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { to: '/works', icon: Music, label: '我的作品' },
    { to: '/upload', icon: Mic, label: '上传作品' },
    { to: '/royalty', icon: DollarSign, label: '版税结算' },
    { to: '/notifications', icon: Bell, label: '消息中心' }
  ],
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: '仪表盘' },
    { to: '/admin', icon: Shield, label: '管理后台' },
    { to: '/users', icon: Users, label: '用户管理' },
    { to: '/materials', icon: FolderOpen, label: '素材库' },
    { to: '/notifications', icon: Bell, label: '消息中心' }
  ]
};

const roleLabels: Record<UserRole, string> = {
  producer: '音乐制作人',
  engineer: '混音师',
  songwriter: '词曲作者',
  admin: '平台管理员'
};

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  const menuItems = user ? roleMenuItems[user.role] || [] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      className="fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-50 overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
              <Music className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-1 min-w-0"
              >
                <h1 className="text-lg font-bold text-white truncate">HarmonyHub</h1>
                <p className="text-xs text-slate-400">音乐协作平台</p>
              </motion.div>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
        </div>

        {sidebarOpen && user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-b border-slate-700/50"
          >
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                alt={user.name}
                className="w-10 h-10 rounded-full border-2 border-violet-500/50"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-violet-400">{roleLabels[user.role]}</p>
              </div>
            </div>
            {user.rating > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                    style={{ width: `${(user.rating / 5) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-yellow-400 font-medium">{user.rating.toFixed(1)}</span>
              </div>
            )}
          </motion.div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-white border border-violet-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="text-sm font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700/50 space-y-1">
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">设置</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">退出登录</span>}
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
