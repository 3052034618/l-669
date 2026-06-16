import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, FileText, Download, Settings, TrendingUp, Users, Music, Calendar, ChevronRight, Check } from 'lucide-react';
import { Card, Button, Modal, StatCard, StatusBadge } from '../components/Card.js';
import { royaltyApi, workApi } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import type { RoyaltySplit, RoyaltyReport, User, Work } from '../../shared/types.js';

interface Participant {
  id: number;
  name: string;
  role: string;
  avatar: string;
  percentage: number;
}

interface WorkWithSplits extends Work {
  splits: Participant[];
  totalRevenue?: number;
}

interface ReportWithDetails extends RoyaltyReport {
  work?: Work;
  splits?: Participant[];
}

const PIE_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const API_HOST = 'http://localhost:3001';

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    'producer': '制作人',
    'engineer': '混音师',
    'songwriter': '词曲作者',
    'admin': '管理员',
    'recording': '录音师'
  };
  return labels[role] || role;
};

export const Royalty: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'settings' | 'reports'>('settings');
  const [works, setWorks] = useState<WorkWithSplits[]>([]);
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [selectedWork, setSelectedWork] = useState<WorkWithSplits | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSplits, setTempSplits] = useState<Participant[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const totalPercentage = tempSplits.reduce((sum, p) => sum + p.percentage, 0);
  const isPercentageValid = totalPercentage === 100;

  const totalRevenue = reports.reduce((sum, r) => sum + (r.totalRevenue || 0), 0);
  const mySplitPercentage = user && works.length > 0
    ? Math.round(works.reduce((sum, w) => {
        const mySplit = w.splits.find(s => s.id === user.id);
        return sum + (mySplit ? mySplit.percentage : 0);
      }, 0) / works.length)
    : 0;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [worksRes, reportsRes] = await Promise.all([
        workApi.getWorks(),
        royaltyApi.getReports()
      ]);

      const worksData: WorkWithSplits[] = [];
      if (worksRes.success && worksRes.data) {
        for (const w of worksRes.data) {
          try {
            const splitsRes = await royaltyApi.getSplits(w.id);
            const splits: Participant[] = (splitsRes.success && splitsRes.data)
              ? splitsRes.data.map((s: RoyaltySplit) => ({
                  id: s.userId,
                  name: s.user?.name || '未知用户',
                  role: s.user?.role || '',
                  avatar: s.user?.avatar || '',
                  percentage: s.percentage
                }))
              : [];
            worksData.push({ ...w, splits, totalRevenue: 0 });
          } catch {
            worksData.push({ ...w, splits: [], totalRevenue: 0 });
          }
        }
      }
      setWorks(worksData);

      const reportsData: ReportWithDetails[] = [];
      if (reportsRes.success && reportsRes.data) {
        for (const r of reportsRes.data) {
          try {
            const splitsRes = await royaltyApi.getSplits(r.workId);
            const splits: Participant[] = (splitsRes.success && splitsRes.data)
              ? splitsRes.data.map((s: RoyaltySplit) => ({
                  id: s.userId,
                  name: s.user?.name || '未知用户',
                  role: s.user?.role || '',
                  avatar: s.user?.avatar || '',
                  percentage: s.percentage
                }))
              : [];
            reportsData.push({ ...r, splits });
          } catch {
            reportsData.push({ ...r, splits: [] });
          }
        }
      }
      setReports(reportsData);
    } catch (err) {
      console.error('加载数据失败', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenSplitModal = (work: WorkWithSplits) => {
    setSelectedWork(work);
    setTempSplits(work.splits.map(s => ({ ...s })));
    setIsModalOpen(true);
  };

  const handlePercentageChange = (index: number, value: number) => {
    const newSplits = [...tempSplits];
    newSplits[index] = { ...newSplits[index], percentage: Math.round(value) };
    setTempSplits(newSplits);
  };

  const handleSaveSplits = async () => {
    if (!selectedWork || !isPercentageValid) return;

    setIsSaving(true);
    try {
      await royaltyApi.setSplits(selectedWork.id, tempSplits.map(s => ({
        userId: s.id,
        percentage: s.percentage
      })));

      setWorks(works.map(w =>
        w.id === selectedWork.id ? { ...w, splits: tempSplits } : w
      ));
      setIsModalOpen(false);
    } catch (err) {
      console.error('保存失败', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadReport = (report: ReportWithDetails) => {
    const url = `${API_HOST}${report.reportPath}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `版税报告_${report.work?.title || report.workId}_${report.month}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pieData = tempSplits.map(s => ({
    name: s.name,
    value: s.percentage
  }));

  const monthlyRevenueMap = new Map<string, number>();
  reports.forEach(r => {
    const m = r.month;
    monthlyRevenueMap.set(m, (monthlyRevenueMap.get(m) || 0) + (r.totalRevenue || 0));
  });
  const monthlyRevenueData = Array.from(monthlyRevenueMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, revenue]) => ({
      month: month.replace(/^\d{4}-/, '') + '月',
      收益: Math.round(revenue)
    }));

  const globalSplitsMap = new Map<string, { name: string; role: string; totalPercentage: number; count: number }>();
  works.forEach(w => {
    w.splits.forEach(s => {
      const key = `${s.name}_${s.role}`;
      const existing = globalSplitsMap.get(key);
      if (existing) {
        existing.totalPercentage += s.percentage;
        existing.count += 1;
      } else {
        globalSplitsMap.set(key, { name: s.name, role: s.role, totalPercentage: s.percentage, count: 1 });
      }
    });
  });
  const globalSplitData = Array.from(globalSplitsMap.values()).map(s => ({
    ...s,
    avgPercentage: Math.round(s.totalPercentage / s.count)
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">版税管理</h1>
            <p className="text-slate-400 mt-1">管理作品分成设置和结算报告</p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            分成设置
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'reports'
                ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            结算报告
          </button>
        </div>
      </motion.div>

      {activeTab === 'settings' && (
        <>
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="累计收益"
              value={`¥${totalRevenue.toLocaleString()}`}
              icon={<TrendingUp className="w-6 h-6 text-white" />}
              color="cyan"
            />
            <StatCard
              title="我的分成比例"
              value={`${mySplitPercentage}%`}
              icon={<Users className="w-6 h-6 text-white" />}
              color="violet"
            />
            <StatCard
              title="管理作品数"
              value={works.length}
              icon={<Music className="w-6 h-6 text-white" />}
              color="yellow"
            />
            <StatCard
              title="报告数量"
              value={reports.length}
              icon={<FileText className="w-6 h-6 text-white" />}
              color="green"
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Music className="w-5 h-5 text-violet-400" />
                    作品分成设置
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">点击作品卡片设置参与方分成比例</p>
                </div>
              </div>

              {works.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  暂无作品数据，请先上传作品
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {works.map((work) => (
                    <Card
                      key={work.id}
                      hover
                      onClick={() => handleOpenSplitModal(work)}
                      className="p-4 group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-medium group-hover:text-violet-300 transition-colors">
                              {work.title}
                            </h3>
                            {work.isLocked && (
                              <StatusBadge status="locked" size="sm" />
                            )}
                          </div>
                          <p className="text-sm text-slate-500">
                            上传于 {work.createdAt}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 transition-colors" />
                      </div>

                      <div className="space-y-2">
                        {work.splits.length > 0 ? (
                          <>
                            <div className="flex -space-x-2">
                              {work.splits.slice(0, 4).map((participant, idx) => (
                                <div
                                  key={participant.id}
                                  className="w-8 h-8 rounded-full border-2 border-slate-800 bg-violet-500/30 flex items-center justify-center text-xs text-violet-300 font-medium"
                                  style={{ zIndex: 4 - idx }}
                                >
                                  {participant.name.charAt(0)}
                                </div>
                              ))}
                              {work.splits.length > 4 && (
                                <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-xs text-slate-400 font-medium">
                                  +{work.splits.length - 4}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {work.splits.map((p) => (
                                <span key={p.id} className="text-xs text-slate-500">
                                  {p.name} {p.percentage}%
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-slate-600">未设置分成</p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}

      {activeTab === 'reports' && (
        <>
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="累计收益"
              value={`¥${totalRevenue.toLocaleString()}`}
              icon={<DollarSign className="w-6 h-6 text-white" />}
              color="green"
            />
            <StatCard
              title="平均分成"
              value={`${mySplitPercentage}%`}
              icon={<Users className="w-6 h-6 text-white" />}
              color="violet"
            />
            <StatCard
              title="报告数量"
              value={reports.length}
              icon={<FileText className="w-6 h-6 text-white" />}
              color="yellow"
            />
            <StatCard
              title="涉及作品"
              value={new Set(reports.map(r => r.workId)).size}
              icon={<Music className="w-6 h-6 text-white" />}
              color="cyan"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-violet-400" />
                      收益趋势
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">各月份收益情况</p>
                  </div>
                </div>
                {monthlyRevenueData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.6} />
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
                          tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
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
                          formatter={(value: number) => [`¥${value.toLocaleString()}`, '收益']}
                        />
                        <Bar
                          dataKey="收益"
                          strokeWidth={0}
                          fill="url(#colorRevenue)"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-500">
                    暂无收益数据
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-400" />
                      分成占比
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">各参与方分成比例分布</p>
                  </div>
                </div>
                {globalSplitData.length > 0 ? (
                  <>
                    <div className="h-80 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={globalSplitData.map(s => ({ name: s.name, value: s.avgPercentage }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {globalSplitData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              borderRadius: '12px',
                              color: '#f1f5f9'
                            }}
                            formatter={(value: number) => [`${value}%`, '平均分成']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                      {globalSplitData.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                          <span className="text-sm text-slate-400">{p.name} ({getRoleLabel(p.role)})</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-80 flex items-center justify-center text-slate-500">
                    暂无分成数据
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-400" />
                    结算报告列表
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">查看和下载各月份的版税结算报告</p>
                </div>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  暂无结算报告
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <Card key={report.id} hover className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-violet-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-white font-medium">{report.work?.title || `作品#${report.workId}`}</h3>
                              <StatusBadge status="completed" size="sm" />
                            </div>
                            <p className="text-sm text-slate-400 mb-2">
                              {report.month.replace('-', '年')}月 · 生成于 {report.generatedAt}
                            </p>
                            {report.splits && report.splits.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {report.splits.map((s, idx) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <div className="w-4 h-4 rounded-full bg-violet-500/30 flex items-center justify-center text-[10px] text-violet-300">
                                      {s.name.charAt(0)}
                                    </div>
                                    <span>{s.name} ¥{((report.totalRevenue * s.percentage) / 100).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 mb-1">总收益</p>
                            <p className="text-xl font-bold text-emerald-400">
                              ¥{report.totalRevenue.toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="md"
                            onClick={() => handleDownloadReport(report)}
                          >
                            <Download className="w-4 h-4" />
                            下载PDF
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`设置分成 - ${selectedWork?.title}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {tempSplits.map((p, idx) => (
                  <div
                    key={p.id}
                    className="w-10 h-10 rounded-full border-2 border-slate-800 bg-violet-500/30 flex items-center justify-center text-sm text-violet-300 font-medium"
                    style={{ zIndex: tempSplits.length - idx }}
                  >
                    {p.name.charAt(0)}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-white font-medium">参与方: {tempSplits.length} 人</p>
                <p className="text-sm text-slate-400">调整各参与方的分成比例</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${isPercentageValid ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalPercentage}%
              </p>
              <p className={`text-sm ${isPercentageValid ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPercentageValid ? '✓ 总和正确' : `需等于100%，还差 ${100 - totalPercentage}%`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {tempSplits.map((participant, index) => (
                <div key={participant.id} className="p-4 rounded-xl bg-slate-700/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-violet-500/30 flex items-center justify-center text-violet-300 font-medium">
                      {participant.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{participant.name}</p>
                      <p className="text-sm text-slate-400">{getRoleLabel(participant.role)}</p>
                    </div>
                    <div className="text-right">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={participant.percentage}
                        onChange={(e) => handlePercentageChange(index, parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white text-center font-bold focus:outline-none focus:border-violet-500"
                      />
                      <span className="text-slate-400 ml-1">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={participant.percentage}
                    onChange={(e) => handlePercentageChange(index, parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    style={{
                      background: `linear-gradient(to right, #8b5cf6 0%, #06b6d4 ${participant.percentage}%, #334155 ${participant.percentage}%, #334155 100%)`
                    }}
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col">
              <h4 className="text-white font-medium mb-4">分成比例预览</h4>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f1f5f9'
                      }}
                      formatter={(value: number) => [`${value}%`, '分成']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {tempSplits.map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-slate-400">{p.name}</span>
                    </div>
                    <span className="text-white font-medium">{p.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSplits}
              disabled={!isPercentageValid || isSaving}
              loading={isSaving}
            >
              <Check className="w-4 h-4" />
              保存设置
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Royalty;
