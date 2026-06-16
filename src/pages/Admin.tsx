import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Database, DollarSign, Music, FolderOpen, Clock, HardDrive, Wifi, Cpu, Play, Settings, Trash2, Users, Upload, Edit3, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card, Button, Modal, StatCard, StatusBadge } from '../components/Card.js';
import { adminApi } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

type TabType = 'overview' | 'materials' | 'system';

interface Material {
  id: number;
  name: string;
  category: string;
  filePath: string;
  accessPermissions: string[];
  createdAt: string;
}

interface SystemStatus {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
}

interface ScheduledTask {
  name: string;
  cron: string;
  nextRun: string;
  lastRun: string;
  status: 'running' | 'idle' | 'error';
}

interface LogEntry {
  id: number;
  time: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const userGrowthData = [
  { month: '1月', 用户数: 45 },
  { month: '2月', 用户数: 68 },
  { month: '3月', 用户数: 92 },
  { month: '4月', 用户数: 118 },
  { month: '5月', 用户数: 145 },
  { month: '6月', 用户数: 172 },
  { month: '7月', 用户数: 198 },
  { month: '8月', 用户数: 215 },
  { month: '9月', 用户数: 230 },
  { month: '10月', 用户数: 242 },
  { month: '11月', 用户数: 250 },
  { month: '12月', 用户数: 256 }
];

const mockMaterials: Material[] = [
  { id: 1, name: '鼓组采样包 - 电子音乐', category: '鼓组', accessPermissions: ['producer', 'engineer'], createdAt: '2025-05-15 10:30' },
  { id: 2, name: '钢琴预设合集', category: '音色', accessPermissions: ['producer', 'engineer', 'songwriter'], createdAt: '2025-05-12 14:20' },
  { id: 3, name: '人声效果链模板', category: '效果器', accessPermissions: ['engineer'], createdAt: '2025-05-10 09:15' },
  { id: 4, name: '混音参考轨道合集', category: '参考', accessPermissions: ['producer', 'engineer'], createdAt: '2025-05-08 16:45' },
  { id: 5, name: '母带处理预设包', category: '效果器', accessPermissions: ['engineer'], createdAt: '2025-05-05 11:30' }
];

const mockTasks: ScheduledTask[] = [
  { name: '数据库备份', cron: '0 2 * * *', nextRun: '2025-06-18 02:00', lastRun: '2025-06-17 02:00', status: 'idle' },
  { name: '版税结算', cron: '0 0 1 * *', nextRun: '2025-07-01 00:00', lastRun: '2025-06-01 00:00', status: 'idle' },
  { name: '系统日志清理', cron: '0 3 * * 0', nextRun: '2025-06-22 03:00', lastRun: '2025-06-15 03:00', status: 'idle' },
  { name: '相似性检测任务', cron: '*/30 * * * *', nextRun: '2025-06-17 14:30', lastRun: '2025-06-17 14:00', status: 'running' }
];

const mockLogs: LogEntry[] = [
  { id: 1, time: '2025-06-17 14:02:15', level: 'success', message: '相似性检测任务完成，处理了 12 个作品' },
  { id: 2, time: '2025-06-17 14:00:00', level: 'info', message: '定时任务相似性检测开始执行' },
  { id: 3, time: '2025-06-17 10:30:22', level: 'info', message: '用户 admin 登录系统' },
  { id: 4, time: '2025-06-17 09:15:48', level: 'warning', message: '磁盘使用率达到 75%，建议清理' },
  { id: 5, time: '2025-06-17 02:00:03', level: 'success', message: '数据库备份完成，文件大小 2.3GB' },
  { id: 6, time: '2025-06-17 02:00:00', level: 'info', message: '定时任务数据库备份开始执行' },
  { id: 7, time: '2025-06-16 23:45:12', level: 'error', message: '邮件服务连接超时，重试中...' },
  { id: 8, time: '2025-06-16 18:30:05', level: 'success', message: '新版税报告生成完成，共 56 份' }
];

const roleOptions = [
  { value: 'producer', label: '制作人' },
  { value: 'engineer', label: '混音工程师' },
  { value: 'songwriter', label: '词曲作者' },
  { value: 'admin', label: '管理员' }
];

const categoryOptions = ['鼓组', '音色', '效果器', '参考', '其他'];

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

export const Admin: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [materials, setMaterials] = useState<Material[]>(mockMaterials);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({ cpu: 32, memory: 58, storage: 75, network: 85 });
  const [tasks, setTasks] = useState<ScheduledTask[]>(mockTasks);
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [permissionModal, setPermissionModal] = useState<{ open: boolean; material: Material | null }>({ open: false, material: null });
  const [uploadModal, setUploadModal] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [uploadForm, setUploadForm] = useState({ name: '', category: '', filePath: '', roles: [] as string[] });
  const [loading, setLoading] = useState({ backup: false, settlement: false });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus({
        cpu: Math.floor(Math.random() * 30) + 20,
        memory: Math.floor(Math.random() * 20) + 50,
        storage: 75 + Math.floor(Math.random() * 5),
        network: Math.floor(Math.random() * 30) + 60
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const openPermissionModal = (material: Material) => {
    setPermissionModal({ open: true, material });
    setSelectedRoles([...material.accessPermissions]);
  };

  const handlePermissionSave = async () => {
    if (!permissionModal.material) return;
    try {
      await adminApi.updateMaterial(permissionModal.material.id, { accessPermissions: selectedRoles });
      setMaterials(materials.map(m => 
        m.id === permissionModal.material!.id ? { ...m, accessPermissions: selectedRoles } : m
      ));
      setPermissionModal({ open: false, material: null });
      showToast('权限设置成功', 'success');
    } catch (error) {
      showToast('权限设置失败', 'error');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm('确定要删除此素材吗？')) return;
    try {
      await adminApi.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
      showToast('素材删除成功', 'success');
    } catch (error) {
      showToast('素材删除失败', 'error');
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadForm.name || !uploadForm.category || !uploadForm.filePath || uploadForm.roles.length === 0) {
      showToast('请填写完整信息', 'error');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('name', uploadForm.name);
      formData.append('category', uploadForm.category);
      formData.append('filePath', uploadForm.filePath);
      formData.append('accessPermissions', JSON.stringify(uploadForm.roles));
      const response = await adminApi.createMaterial(formData);
      if (response.success && response.data) {
        setMaterials([response.data as Material, ...materials]);
        setUploadModal(false);
        setUploadForm({ name: '', category: '', filePath: '', roles: [] });
        showToast('素材上传成功', 'success');
      }
    } catch (error) {
      showToast('素材上传失败', 'error');
    }
  };

  const handleTriggerBackup = async () => {
    setLoading({ ...loading, backup: true });
    try {
      await adminApi.triggerBackup();
      showToast('备份任务已触发', 'success');
      addLog('success', '手动触发数据库备份任务');
      setTasks(tasks.map(t => t.name === '数据库备份' ? { ...t, status: 'running' } : t));
      setTimeout(() => {
        setTasks(tasks.map(t => t.name === '数据库备份' ? { ...t, status: 'idle', lastRun: new Date().toLocaleString('zh-CN') } : t));
        addLog('success', '手动备份任务完成');
      }, 3000);
    } catch (error) {
      showToast('触发备份失败', 'error');
    } finally {
      setLoading({ ...loading, backup: false });
    }
  };

  const handleTriggerSettlement = async () => {
    setLoading({ ...loading, settlement: true });
    try {
      await adminApi.triggerSettlement();
      showToast('结算任务已触发', 'success');
      addLog('success', '手动触发版税结算任务');
      setTasks(tasks.map(t => t.name === '版税结算' ? { ...t, status: 'running' } : t));
      setTimeout(() => {
        setTasks(tasks.map(t => t.name === '版税结算' ? { ...t, status: 'idle', lastRun: new Date().toLocaleString('zh-CN') } : t));
        addLog('success', '手动结算任务完成');
      }, 3000);
    } catch (error) {
      showToast('触发结算失败', 'error');
    } finally {
      setLoading({ ...loading, settlement: false });
    }
  };

  const addLog = (level: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const newLog: LogEntry = {
      id: Date.now(),
      time: new Date().toLocaleString('zh-CN'),
      level,
      message
    };
    setLogs([newLog, ...logs]);
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default: return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-blue-400';
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">无权限访问</h2>
          <p className="text-slate-400">此页面仅管理员角色可访问</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {toast.show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.message}
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-violet-400" />
            管理控制台
          </h1>
          <p className="text-slate-400 mt-1">平台数据监控与系统管理</p>
        </div>
        <StatusBadge status="active" />
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-2 bg-slate-800/40 backdrop-blur-xl p-1.5 rounded-2xl w-fit">
        {[
          { key: 'overview', label: '统计概览', icon: Database },
          { key: 'materials', label: '素材库管理', icon: FolderOpen },
          { key: 'system', label: '系统控制', icon: Settings }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as TabType)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="总用户数"
              value="256"
              icon={<Users className="w-6 h-6 text-white" />}
              trend={12}
              color="violet"
            />
            <StatCard
              title="活跃项目"
              value="48"
              icon={<FolderOpen className="w-6 h-6 text-white" />}
              trend={8}
              color="cyan"
            />
            <StatCard
              title="作品总数"
              value="1,024"
              icon={<Music className="w-6 h-6 text-white" />}
              trend={15}
              color="green"
            />
            <StatCard
              title="平台收益"
              value="¥1,280,500"
              icon={<DollarSign className="w-6 h-6 text-white" />}
              trend={23}
              color="yellow"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">用户增长趋势</h2>
                    <p className="text-sm text-slate-400 mt-1">近12个月用户注册情况</p>
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis
                        dataKey="month"
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
                      <Line
                        type="monotone"
                        dataKey="用户数"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#8b5cf6' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-6 h-full">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  系统状态监控
                </h2>
                <div className="space-y-6">
                  {[
                    { label: 'CPU 使用率', value: systemStatus.cpu, icon: Cpu, color: 'violet' },
                    { label: '内存使用率', value: systemStatus.memory, icon: Database, color: 'cyan' },
                    { label: '存储空间', value: systemStatus.storage, icon: HardDrive, color: systemStatus.storage > 80 ? 'red' : 'green' },
                    { label: '网络带宽', value: systemStatus.network, icon: Wifi, color: 'green' }
                  ].map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <item.icon className={`w-4 h-4 ${
                            item.color === 'violet' ? 'text-violet-400' :
                            item.color === 'cyan' ? 'text-cyan-400' :
                            item.color === 'red' ? 'text-red-400' : 'text-emerald-400'
                          }`} />
                          <span className="text-sm text-slate-400">{item.label}</span>
                        </div>
                        <span className={`text-sm font-medium ${
                          item.color === 'violet' ? 'text-violet-400' :
                          item.color === 'cyan' ? 'text-cyan-400' :
                          item.color === 'red' ? 'text-red-400' : 'text-emerald-400'
                        }`}>{item.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`h-full rounded-full ${
                            item.color === 'violet' ? 'bg-violet-500' :
                            item.color === 'cyan' ? 'bg-cyan-500' :
                            item.color === 'red' ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-violet-400" />
                  素材库管理
                </h2>
                <p className="text-sm text-slate-400 mt-1">管理平台共享素材及访问权限</p>
              </div>
              <Button onClick={() => setUploadModal(true)}>
                <Upload className="w-4 h-4" />
                上传素材
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">素材名称</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">分类</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">访问权限</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">上传时间</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material, index) => (
                    <motion.tr
                      key={material.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                            <Music className="w-5 h-5 text-violet-400" />
                          </div>
                          <span className="text-white font-medium">{material.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300 text-sm">
                          {material.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {material.accessPermissions.map(role => (
                            <span
                              key={role}
                              className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs"
                            >
                              {roleOptions.find(r => r.value === role)?.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-sm">{material.createdAt}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openPermissionModal(material)}>
                            <Edit3 className="w-4 h-4" />
                            权限
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteMaterial(material.id)}>
                            <Trash2 className="w-4 h-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Play className="w-5 h-5 text-violet-400" />
                  手动操作
                </h2>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">数据库备份</h3>
                        <p className="text-sm text-slate-400 mt-1">立即执行全量数据库备份</p>
                      </div>
                      <Button onClick={handleTriggerBackup} loading={loading.backup}>
                        <Database className="w-4 h-4" />
                        触发备份
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-medium">版税结算</h3>
                        <p className="text-sm text-slate-400 mt-1">立即执行本月版税结算</p>
                      </div>
                      <Button onClick={handleTriggerSettlement} loading={loading.settlement}>
                        <DollarSign className="w-4 h-4" />
                        触发结算
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  定时任务状态
                </h2>
                <div className="space-y-3">
                  {tasks.map((task, index) => (
                    <motion.div
                      key={task.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{task.name}</span>
                        <StatusBadge status={task.status} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-500">Cron: </span>{task.cron}
                        </div>
                        <div>
                          <span className="text-slate-500">上次运行: </span>{task.lastRun}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                系统日志
              </h2>
              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-4 max-h-96 overflow-y-auto font-mono text-sm">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 py-2 border-b border-slate-700/30 last:border-0">
                    {getLogIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <span className="text-slate-500 mr-2">[{log.time}]</span>
                      <span className={`${getLogColor(log.level)} mr-2 uppercase`}>[{log.level}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      <Modal
        isOpen={permissionModal.open}
        onClose={() => setPermissionModal({ open: false, material: null })}
        title="权限设置"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">
            设置素材 "<span className="text-white">{permissionModal.material?.name}</span>" 的访问权限
          </p>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">可访问角色</label>
            {roleOptions.map(role => (
              <label key={role.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoles([...selectedRoles, role.value]);
                    } else {
                      setSelectedRoles(selectedRoles.filter(r => r !== role.value));
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                />
                <span className="text-white">{role.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setPermissionModal({ open: false, material: null })}>
              取消
            </Button>
            <Button onClick={handlePermissionSave}>保存设置</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        title="上传素材"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">素材名称</label>
            <input
              type="text"
              value={uploadForm.name}
              onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
              placeholder="请输入素材名称"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">分类</label>
            <select
              value={uploadForm.category}
              onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            >
              <option value="">请选择分类</option>
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">文件路径</label>
            <input
              type="text"
              value={uploadForm.filePath}
              onChange={(e) => setUploadForm({ ...uploadForm, filePath: e.target.value })}
              placeholder="请输入文件存储路径"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">访问权限</label>
            <div className="space-y-2">
              {roleOptions.map(role => (
                <label key={role.value} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={uploadForm.roles.includes(role.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUploadForm({ ...uploadForm, roles: [...uploadForm.roles, role.value] });
                      } else {
                        setUploadForm({ ...uploadForm, roles: uploadForm.roles.filter(r => r !== role.value) });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500 focus:ring-violet-500 focus:ring-offset-0"
                  />
                  <span className="text-white">{role.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setUploadModal(false)}>取消</Button>
            <Button onClick={handleUploadSubmit}>上传</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Admin;
