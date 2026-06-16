import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { FolderOpen, Headphones, DollarSign, Bell, TrendingUp, Music, Users, Clock } from 'lucide-react';
import { Card, StatCard, StatusBadge } from '../components/Card.js';
import { useAuthStore } from '../store/authStore.js';

const statsData = {
  projects: 12,
  tasks: 8,
  revenue: '¥128,500',
  notifications: 23
};

const trendData = {
  trendProjects: 15,
  trendTasks: 8,
  trendRevenue: 23,
  trendNotifications: -5
};

const chartData = [
  { name: '周一', 项目数: 12, 任务数: 8 },
  { name: '周二', 项目数: 15, 任务数: 12 },
  { name: '周三', 项目数: 18, 任务数: 15 },
  { name: '周四', 项目数: 22, 任务数: 18 },
  { name: '周五', 项目数: 25, 任务数: 20 },
  { name: '周六', 项目数: 28, 任务数: 22 },
  { name: '周日', 项目数: 30, 任务数: 25 }
];

const activitiesData = [
  {
    id: 1,
    type: 'project',
    title: '新项目创建：《夏日旋律》专辑',
    time: '10分钟前',
    status: 'active',
    icon: FolderOpen
  },
  {
    id: 2,
    type: 'task',
    title: '任务完成：《星空》混音工程',
    time: '25分钟前',
    status: 'completed',
    icon: Headphones
  },
  {
    id: 3,
    type: 'work',
    title: '新作品上传：《晚风》Demo',
    time: '1小时前',
    status: 'pending',
    icon: Music
  },
  {
    id: 4,
    type: 'team',
    title: '团队成员加入：李明（混音师）',
    time: '3小时前',
    status: 'verified',
    icon: Users
  },
  {
    id: 5,
    type: 'task',
    title: '任务分配：《海洋之心》母带处理',
    time: '5小时前',
    status: 'assigned',
    icon: Clock
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}，{user?.name || '用户'} 👋
          </h1>
          <p className="text-slate-400 mt-1">
            欢迎回到 HarmonyHub，今天是 {currentTime.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status="active" />
          <span className="text-sm text-slate-400">系统运行正常</span>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="活跃项目数"
          value={statsData.projects}
          icon={<FolderOpen className="w-6 h-6 text-white" />}
          trend={trendData.trendProjects}
          color="violet"
        />
        <StatCard
          title="进行中任务"
          value={statsData.tasks}
          icon={<Headphones className="w-6 h-6 text-white" />}
          trend={trendData.trendTasks}
          color="cyan"
        />
        <StatCard
          title="本月收益"
          value={statsData.revenue}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          trend={trendData.trendRevenue}
          color="green"
        />
        <StatCard
          title="消息通知数"
          value={statsData.notifications}
          icon={<Bell className="w-6 h-6 text-white" />}
          trend={trendData.trendNotifications}
          color="yellow"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  项目进度趋势
                </h2>
                <p className="text-sm text-slate-400 mt-1">近7天项目和任务增长情况</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                  <span className="text-slate-400">项目数</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                  <span className="text-slate-400">任务数</span>
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                    }}
                    itemStyle={{ color: '#f1f5f9' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '8px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="项目数"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorProjects)"
                  />
                  <Area
                    type="monotone"
                    dataKey="任务数"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTasks)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                最近活动
              </h2>
              <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                查看全部
              </button>
            </div>
            <div className="space-y-4">
              {activitiesData.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.3 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-700/30 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'project' ? 'bg-violet-500/20 text-violet-400' :
                    activity.type === 'task' ? 'bg-cyan-500/20 text-cyan-400' :
                    activity.type === 'work' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    <activity.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate group-hover:text-violet-300 transition-colors">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">{activity.time}</span>
                      <StatusBadge status={activity.status} size="sm" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
