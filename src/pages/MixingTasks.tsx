import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Star, Music, Upload, FileCheck, CheckCircle2, AlertCircle, Headphones, Play, Volume2, User, CheckCheck, XCircle, MessageSquare } from 'lucide-react';
import { Card, Button, Modal, StatusBadge } from '../components/Card.js';
import { mixingApi, masterApi } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import type { MixingTask, Master } from '../../shared/types.js';

type TabType = 'available' | 'my' | 'confirm' | 'completed';

interface Toast {
  show: boolean;
  type: 'success' | 'error';
  message: string;
}

const MixingTasks: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [availableTasks, setAvailableTasks] = useState<MixingTask[]>([]);
  const [myTasks, setMyTasks] = useState<MixingTask[]>([]);
  const [pendingMasters, setPendingMasters] = useState<Master[]>([]);
  const [completedTasks, setCompletedTasks] = useState<MixingTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast>({ show: false, type: 'success', message: '' });

  const [agreementModalOpen, setAgreementModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MixingTask | null>(null);
  const [agreementContent, setAgreementContent] = useState('');
  const [agreementLoading, setAgreementLoading] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const masterFileRef = useRef<HTMLInputElement>(null);

  const [masterDetail, setMasterDetail] = useState<Master | null>(null);
  const [masterDetailOpen, setMasterDetailOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmNote, setConfirmNote] = useState('');

  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<MixingTask | null>(null);

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      if (activeTab === 'available') {
        const response = await mixingApi.getAvailableTasks();
        if (response.success && response.data) {
          setAvailableTasks(response.data);
        }
      } else if (activeTab === 'my') {
        const response = await mixingApi.getMyTasks();
        if (response.success && response.data) {
          const all = response.data as MixingTask[];
          setMyTasks(all.filter(t => t.status !== 'completed'));
          setCompletedTasks(all.filter(t => t.status === 'completed'));
        }
      } else if (activeTab === 'completed') {
        const response = await mixingApi.getMyTasks();
        if (response.success && response.data) {
          const all = response.data as MixingTask[];
          setMyTasks(all.filter(t => t.status !== 'completed'));
          setCompletedTasks(all.filter(t => t.status === 'completed'));
        }
      } else if (activeTab === 'confirm') {
        const response = await masterApi.getMasters();
        if (response.success && response.data) {
          setPendingMasters(response.data.filter((m: Master) => m.isVerified && !m.confirmedAt));
        }
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || '加载任务失败');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 3000);
  };

  const canAcceptTask = (task: MixingTask) => {
    if (!user) return false;
    if (user.rating < task.minRatingRequired) return false;
    if (user.currentLoad >= 3) return false;
    return true;
  };

  const getAcceptDisabledReason = (task: MixingTask) => {
    if (!user) return '请先登录';
    if (user.rating < task.minRatingRequired) {
      return `评分不足（需要 ${task.minRatingRequired.toFixed(1)}，当前 ${user.rating.toFixed(1)}）`;
    }
    if (user.currentLoad >= 3) {
      return '当前任务负载已满（最多同时3个任务）';
    }
    return '';
  };

  const handleAcceptTask = async (task: MixingTask) => {
    if (!canAcceptTask(task)) {
      showToast('error', getAcceptDisabledReason(task));
      return;
    }
    setAcceptingId(task.id);
    try {
      const response = await mixingApi.acceptTask(task.id);
      if (response.success) {
        showToast('success', '任务接受成功！');
        loadTasks();
      } else {
        showToast('error', response.message || '接受任务失败');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || '接受任务失败');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleOpenAgreement = async (task: MixingTask) => {
    setSelectedTask(task);
    setAgreementLoading(true);
    try {
      const response = await mixingApi.getAgreement(task.id);
      if (response.success && response.data) {
        setAgreementContent(response.data.content || '协议内容加载中...');
      }
    } catch (err: any) {
      setAgreementContent('协议内容加载失败，请稍后重试。');
    } finally {
      setAgreementLoading(false);
    }
    setAgreementModalOpen(true);
  };

  const handleSignAgreement = async () => {
    if (!selectedTask || !user) return;
    try {
      const response = await mixingApi.signAgreement(selectedTask.id, user.role);
      if (response.success) {
        showToast('success', '协议签署成功！');
        setAgreementModalOpen(false);
        loadTasks();
      } else {
        showToast('error', response.message || '签署失败');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || '签署失败');
    }
  };

  const handleOpenUpload = (task: MixingTask) => {
    setSelectedTask(task);
    setUploadFile(null);
    setUploadModalOpen(true);
  };

  const handleUploadMaster = async () => {
    if (!selectedTask || !uploadFile) {
      showToast('error', '请选择要上传的文件');
      return;
    }
    setUploadingId(selectedTask.id);
    try {
      const formData = new FormData();
      formData.append('master', uploadFile);

      const response = await masterApi.uploadMaster(selectedTask.id, formData);
      if (response.success) {
        const masterData = response.data as Master;
        if (masterData.isVerified) {
          showToast('success', '母带上传成功，已通过音频校验！');
        } else {
          showToast('error', `母带未通过校验：${masterData.rejectReason || '格式或参数不达标'}`);
        }
        setUploadModalOpen(false);
        loadTasks();
      } else {
        showToast('error', response.message || '上传失败');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '上传失败';
      showToast('error', msg);
    } finally {
      setUploadingId(null);
    }
  };

  const handleOpenMasterDetail = (master: Master) => {
    setMasterDetail(master);
    setConfirmNote('');
    setMasterDetailOpen(true);
  };

  const handleConfirmMaster = async (masterId: number) => {
    setConfirmingId(masterId);
    try {
      const response = await masterApi.confirmMaster(masterId, confirmNote);
      if (response.success) {
        showToast('success', '母带确认成功，任务已完成！');
        setMasterDetailOpen(false);
        loadTasks();
      } else {
        showToast('error', response.message || '确认失败');
      }
    } catch (err: any) {
      showToast('error', err.response?.data?.message || '确认失败');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleOpenTaskDetail = (task: MixingTask) => {
    setDetailTask(task);
    setTaskDetailOpen(true);
  };

  const getProgress = (status: string) => {
    switch (status) {
      case 'assigned': return 25;
      case 'in_progress': return 50;
      case 'mastering': return 75;
      case 'completed': return 100;
      default: return 5;
    }
  };

  const getProgressSteps = (task: MixingTask) => {
    const hasMaster = task.masters && task.masters.length > 0;
    const verifiedMaster = task.masters?.find(m => m.isVerified);
    const confirmedMaster = task.masters?.find(m => m.confirmedAt);
    return [
      { label: '任务接单', done: true },
      { label: '协议签署', done: !!task.agreementSignedAt || task.status === 'in_progress' || task.status === 'mastering' || task.status === 'completed' },
      { label: '混音工作中', done: task.status === 'mastering' || task.status === 'completed' },
      { label: '母带上传并校验', done: !!verifiedMaster || task.status === 'completed' },
      { label: '制作人验收', done: !!confirmedMaster || task.status === 'completed' },
    ];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const isEngineer = user?.role === 'engineer';
  const isProducer = user?.role === 'producer' || user?.role === 'admin';

  const latestMaster = (task: MixingTask) => {
    if (!task.masters || task.masters.length === 0) return null;
    return [...task.masters].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
  };

  const getAgreementStatus = (task: MixingTask) => {
    if (task.agreementSignedAt) return { label: '双方已签署', color: 'emerald', icon: CheckCheck };
    return { label: '待签署', color: 'amber', icon: Clock };
  };

  const renderTaskCard = (task: MixingTask, isAvailable: boolean) => {
    const canAccept = canAcceptTask(task);
    const disabledReason = getAcceptDisabledReason(task);
    const progress = getProgress(task.status);
    const master = latestMaster(task);
    const agreementInfo = getAgreementStatus(task);

    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card hover className="p-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-5 h-5 text-violet-400 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-white truncate">{task.work?.title || '未命名作品'}</h3>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={task.status} size="sm" />
                {!isAvailable && isEngineer && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${agreementInfo.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    <agreementInfo.icon className="w-3 h-3" />
                    {agreementInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isProducer && !isAvailable && (
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
              <User className="w-3.5 h-3.5" />
              <span>混音师：</span>
              <span className="text-slate-300">{task.assignee?.nickname || task.assignee?.username || '未分配'}</span>
            </div>
          )}
          {isEngineer && !isAvailable && (
            <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
              <User className="w-3.5 h-3.5" />
              <span>制作人：</span>
              <span className="text-slate-300">{task.work?.creator?.nickname || task.work?.creator?.username || '-'}</span>
            </div>
          )}

          <div className="space-y-2.5 mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">预算：</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(task.budget)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm">截止：</span>
              <span className="text-amber-400">{task.deadline ? formatDate(task.deadline) : '无期限'}</span>
            </div>
            {isAvailable && (
              <div className="flex items-center gap-2 text-slate-300">
                <Star className="w-4 h-4 text-cyan-400" />
                <span className="text-sm">最低评分：</span>
                <span className="text-cyan-400 font-medium">{task.minRatingRequired.toFixed(1)}</span>
              </div>
            )}
          </div>

          {!isAvailable && (
            <>
              <div className="mb-4 bg-slate-700/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">任务进度</span>
                  <span className="text-xs text-violet-400 font-medium">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full"
                  />
                </div>
              </div>

              {isEngineer && master && (
                <div className="mb-4 bg-slate-700/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-medium text-slate-300">最新母带上传</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">格式</div>
                      <div className="text-slate-300 font-medium">{master.format}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">采样率</div>
                      <div className="text-slate-300 font-medium">{(master.sampleRate / 1000).toFixed(0)}k</div>
                    </div>
                    <div>
                      <div className="text-slate-500">校验</div>
                      <div className={master.isVerified ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                        {master.isVerified ? '通过' : '未通过'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isProducer && task.masters && task.masters.length > 0 && (
                <div className="mb-4 bg-slate-700/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-medium text-slate-300">
                      母带版本：共 {task.masters.length} 个
                      {task.masters.some(m => m.isVerified) && (
                        <span className="ml-1.5 text-emerald-400">（已校验）</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-auto flex flex-wrap gap-2">
            {isAvailable ? (
              <>
                <Button variant="primary" size="sm" disabled={!canAccept || acceptingId === task.id} loading={acceptingId === task.id} onClick={() => handleAcceptTask(task)} className="flex-1">
                  <CheckCircle2 className="w-4 h-4" />
                  接受任务
                </Button>
                {!canAccept && disabledReason && (
                  <div className="w-full flex items-center gap-1.5 text-xs text-red-400 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {disabledReason}
                  </div>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => handleOpenTaskDetail(task)}>
                  <FileCheck className="w-4 h-4" />
                  详情
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleOpenAgreement(task)}>
                  协议
                </Button>
                {isEngineer && (task.status === 'in_progress' || task.status === 'assigned' || task.status === 'mastering') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenUpload(task)}>
                    <Upload className="w-4 h-4" />
                    上传母带
                  </Button>
                )}
                {isProducer && (task.status === 'mastering') && task.masters?.some(m => m.isVerified && !m.confirmedAt) && (
                  <Button variant="primary" size="sm" onClick={() => setActiveTab('confirm')}>
                    <Headphones className="w-4 h-4" />
                    去确认
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderCompletedCard = (task: MixingTask) => {
    const master = latestMaster(task);
    const confirmed = master?.confirmedAt;
    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card hover className="p-6 h-full flex flex-col bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-white truncate">{task.work?.title || '未命名作品'}</h3>
              </div>
              <StatusBadge status="completed" size="sm" />
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
            <User className="w-3.5 h-3.5" />
            <span>
              {isEngineer ? '制作人' : '混音师'}：
            </span>
            <span className="text-slate-300">
              {isEngineer
                ? (task.work?.creator?.nickname || task.work?.creator?.username || '-')
                : (task.assignee?.nickname || task.assignee?.username || '-')}
            </span>
          </div>

          <div className="space-y-2.5 mb-4 flex-1">
            <div className="flex items-center gap-2 text-slate-300">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">预算：</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(task.budget)}</span>
            </div>
            <div className="flex items-start gap-2 text-slate-300">
              <CheckCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-slate-400">验收时间：</span>
                <span className="text-emerald-400 font-medium">{formatDateTime(confirmed || master?.confirmedAt)}</span>
              </div>
            </div>
            {master?.confirmNote && (
              <div className="mt-3 bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 mb-1">验收备注</div>
                    <div className="text-sm text-slate-200 break-words">{master.confirmNote}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-2">
            <Button variant="ghost" size="sm" onClick={() => handleOpenTaskDetail(task)} className="w-full border border-emerald-500/20">
              <FileCheck className="w-4 h-4" />
              查看交付详情
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderMasterCard = (master: Master) => {
    return (
      <motion.div key={master.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card hover className="p-6 h-full">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-6 h-6 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">
                {master.task?.work?.title || '母带作品'}
              </h3>
              <StatusBadge status="verified" size="sm" />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Music className="w-4 h-4 text-cyan-400" />
              <span className="text-sm">格式：</span>
              <span className="text-cyan-400">{master.format}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">采样率：</span>
              <span className="text-emerald-400">{(master.sampleRate / 1000).toFixed(1)} kHz</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-sm">位深度：</span>
              <span className="text-amber-400">{master.bitDepth} bit</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <User className="w-3.5 h-3.5" />
              混音师：{master.task?.assignee?.nickname || master.task?.assignee?.username || '-'}
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              上传于 {new Date(master.uploadedAt).toLocaleString('zh-CN')}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenMasterDetail(master)}>
              <Play className="w-4 h-4" />
              试听确认
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderEngineerDashboard = () => {
    const pendingTasks = myTasks.filter(t => t.status === 'assigned');
    const inProgress = myTasks.filter(t => t.status === 'in_progress' || t.status === 'mastering');
    const verifiedMastersCount = myTasks.filter(t => t.masters?.some(m => m.isVerified)).length;
    const totalEarnings = completedTasks.reduce((s, t) => s + t.budget, 0);

    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">进行中任务</div>
              <div className="text-3xl font-bold text-white">{inProgress.length + pendingTasks.length}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-cyan-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">已校验母带</div>
              <div className="text-3xl font-bold text-white">{verifiedMastersCount}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">已完成任务</div>
              <div className="text-3xl font-bold text-white">{completedTasks.length}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">累计收入</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(totalEarnings)}</div>
            </Card>
          </div>
        </motion.div>

        {pendingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">待开始任务 ({pendingTasks.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingTasks.map((task) => renderTaskCard(task, false))}
            </div>
          </div>
        )}

        {inProgress.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Headphones className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold text-white">进行中任务 ({inProgress.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgress.map((task) => renderTaskCard(task, false))}
            </div>
          </div>
        )}

        {inProgress.length === 0 && pendingTasks.length === 0 && myTasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Music className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">暂无进行中的任务</h3>
            <p className="text-slate-400">去"可接任务"中接单开始工作吧</p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderProducerDashboard = () => {
    const pendingTasks = myTasks.filter(t => t.status === 'assigned' || t.status === 'in_progress');
    const masteringTasks = myTasks.filter(t => t.status === 'mastering');
    const awaitingConfirm = myTasks.filter(t => t.masters?.some(m => m.isVerified && !m.confirmedAt)).length;

    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 bg-gradient-to-br from-violet-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">制作中项目</div>
              <div className="text-3xl font-bold text-white">{pendingTasks.length + masteringTasks.length}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-cyan-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">待验收项目</div>
              <div className="text-3xl font-bold text-white">{awaitingConfirm}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">已完成项目</div>
              <div className="text-3xl font-bold text-white">{completedTasks.length}</div>
            </Card>
            <Card className="p-5 bg-gradient-to-br from-amber-500/10 to-transparent">
              <div className="text-sm text-slate-400 mb-1">累计投入</div>
              <div className="text-3xl font-bold text-white">{formatCurrency(completedTasks.reduce((s, t) => s + t.budget, 0))}</div>
            </Card>
          </div>
        </motion.div>

        {awaitingConfirm > 0 && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Headphones className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <div className="text-lg font-semibold text-white">有 {awaitingConfirm} 个母带等待您的验收</div>
                  <div className="text-sm text-slate-400">混音师已完成混音工作，您可以试听后确认通过</div>
                </div>
              </div>
              <Button variant="primary" onClick={() => setActiveTab('confirm')}>
                <Play className="w-4 h-4" />
                立即去验收
              </Button>
            </div>
          </motion.div>
        )}

        {masteringTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-violet-400" />
              <h2 className="text-xl font-bold text-white">混音中，待验收 ({masteringTasks.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {masteringTasks.map((task) => renderTaskCard(task, false))}
            </div>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">进行中的项目 ({pendingTasks.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingTasks.map((task) => renderTaskCard(task, false))}
            </div>
          </div>
        )}

        {masteringTasks.length === 0 && pendingTasks.length === 0 && myTasks.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Music className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">暂无进行中的项目</h3>
            <p className="text-slate-400">在工作台中发布新的混音任务吧</p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderMyTab = () => {
    if (isEngineer) return renderEngineerDashboard();
    if (isProducer) return renderProducerDashboard();
    return renderProducerDashboard();
  };

  const currentTasks = activeTab === 'available' ? availableTasks : myTasks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">混音任务</h1>
          <p className="text-slate-400">
            {isEngineer ? '混音工作台 — 接任务、签协议、交付母带' : '制作人工作台 — 追踪项目进度、验收混音成品'}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex gap-2 mb-8 bg-slate-800/50 p-1.5 rounded-2xl w-fit flex-wrap">
          {isEngineer && (
            <button onClick={() => setActiveTab('available')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'available' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
              可接任务
            </button>
          )}
          <button onClick={() => setActiveTab('my')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'my' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            我的任务
          </button>
          <button onClick={() => setActiveTab('completed')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'completed' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            已完成 ({completedTasks.length})
          </button>
          {isProducer && (
            <button onClick={() => setActiveTab('confirm')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'confirm' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
              待确认母带 {pendingMasters.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500/30 text-red-300 text-xs">{pendingMasters.length}</span>}
            </button>
          )}
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : activeTab === 'confirm' ? (
          pendingMasters.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <Headphones className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">暂无待确认母带</h3>
              <p className="text-slate-400">混音师上传的母带将在这里等待您的验收</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMasters.map((master) => renderMasterCard(master))}
            </div>
          )
        ) : activeTab === 'completed' ? (
          completedTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-slate-600" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">暂无已完成任务</h3>
              <p className="text-slate-400">完成并通过验收的任务将在这里存档</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTasks.map((task) => renderCompletedCard(task))}
            </div>
          )
        ) : activeTab === 'my' ? (
          renderMyTab()
        ) : currentTasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Music className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {activeTab === 'available' ? '暂无可用任务' : '暂无进行中的任务'}
            </h3>
            <p className="text-slate-400">
              {activeTab === 'available' ? '请稍后再来查看新的混音任务' : '接受一些任务开始您的工作吧'}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTasks.map((task) => renderTaskCard(task, activeTab === 'available'))}
          </div>
        )}
      </div>

      <Modal isOpen={agreementModalOpen} onClose={() => setAgreementModalOpen(false)} title="服务协议" size="lg">
        {agreementLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div>
            <div className="bg-slate-900/50 rounded-xl p-4 mb-6 max-h-64 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {agreementContent || '混音服务协议\n\n一、服务内容\n1. 混音师同意为制作人提供专业的音频混音服务。\n2. 服务包括但不限于：音量平衡、频率均衡、动态处理、空间效果处理等。\n3. 最终交付物为符合行业标准的混音成品音频文件。\n\n二、双方权利与义务\n1. 制作人提供清晰的分轨音频文件及参考资料。\n2. 混音师按照行业标准完成混音工作。\n3. 在截止日期前交付成品。\n\n三、费用与支付\n1. 服务费用按约定预算执行。\n2. 支付方式：任务完成并验收合格后一次性支付。\n\n四、知识产权\n1. 成品著作权归制作人所有。\n2. 混音师享有署名权。'}
              </pre>
            </div>
            <div className="flex items-start gap-3 mb-6 p-4 bg-slate-800/50 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">请仔细阅读以上协议内容。点击"签署"即表示您已阅读并同意本协议的所有条款。</div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAgreementModalOpen(false)}>关闭</Button>
              <Button variant="primary" onClick={handleSignAgreement}><FileCheck className="w-4 h-4" />签署协议</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="上传母带" size="md">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">选择音频文件 <span className="text-red-400">*</span></label>
            <input ref={masterFileRef} type="file" accept=".wav,.flac" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="hidden" id="master-upload" />
            <label htmlFor="master-upload" className="cursor-pointer block">
              <div className={`border-2 border-dashed rounded-xl p-8 text-center hover:border-violet-500 transition-colors ${uploadFile ? 'border-violet-500/50 bg-violet-500/5' : 'border-slate-600'}`}>
                {uploadFile ? (
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <Headphones className="w-6 h-6 text-violet-400" />
                    </div>
                    <p className="text-white font-medium">{uploadFile.name}</p>
                    <p className="text-sm text-slate-400 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">点击选择音频文件</p>
                    <p className="text-xs text-slate-500 mt-1">仅支持 WAV、FLAC 格式（后端将自动校验采样率和位深度）</p>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-2">音频校验标准：</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• 格式要求：WAV 或 FLAC</li>
              <li>• 采样率：≥ 44.1 kHz</li>
              <li>• 位深度：≥ 24 bit</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleUploadMaster} disabled={!uploadFile || uploadingId === selectedTask?.id} loading={uploadingId === selectedTask?.id}>
              <Upload className="w-4 h-4" />
              上传
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={taskDetailOpen} onClose={() => setTaskDetailOpen(false)} title="任务详细信息" size="lg">
        {detailTask && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Music className="w-6 h-6 text-violet-400" />
                <h3 className="text-xl font-bold text-white">{detailTask.work?.title || '未命名作品'}</h3>
                <StatusBadge status={detailTask.status} size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">预算：</span>
                  <span className="text-emerald-400 font-medium ml-1">{formatCurrency(detailTask.budget)}</span>
                </div>
                <div>
                  <span className="text-slate-400">截止日期：</span>
                  <span className="text-amber-400 font-medium ml-1">{formatDate(detailTask.deadline)}</span>
                </div>
                <div>
                  <span className="text-slate-400">混音师：</span>
                  <span className="text-slate-200 ml-1">{detailTask.assignee?.nickname || detailTask.assignee?.username || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400">制作人：</span>
                  <span className="text-slate-200 ml-1">{detailTask.work?.creator?.nickname || detailTask.work?.creator?.username || '-'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-3">任务进度</h4>
              <div className="space-y-3">
                {getProgressSteps(detailTask).map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                      {step.done ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${step.done ? 'text-white' : 'text-slate-400'}`}>{step.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detailTask.masters && detailTask.masters.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">母带上传与校验记录</h4>
                <div className="space-y-3">
                  {[...detailTask.masters].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()).map((m, idx) => (
                    <div key={m.id} className={`p-4 rounded-xl border ${m.confirmedAt ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-700/30 border-slate-600/50'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.isVerified ? 'bg-violet-500/20' : 'bg-red-500/20'}`}>
                            {m.isVerified ? <Headphones className="w-5 h-5 text-violet-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium">版本 {detailTask.masters!.length - idx}</div>
                            <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
                              <div>
                                <span className="text-slate-500">格式：</span>
                                <span className="text-slate-300">{m.format}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">采样率：</span>
                                <span className="text-slate-300">{(m.sampleRate / 1000).toFixed(1)} kHz</span>
                              </div>
                              <div>
                                <span className="text-slate-500">位深度：</span>
                                <span className="text-slate-300">{m.bitDepth} bit</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                              {m.isVerified ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">✓ 校验通过</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">✗ {m.rejectReason || '校验未通过'}</span>
                              )}
                              <span className="text-slate-500">上传于 {formatDateTime(m.uploadedAt)}</span>
                            </div>
                            {m.confirmedAt && (
                              <div className="mt-3 pt-3 border-t border-emerald-500/20">
                                <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  已于 {formatDateTime(m.confirmedAt)} 验收通过
                                </div>
                                {m.confirmNote && (
                                  <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3 mt-1">
                                    "{m.confirmNote}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setTaskDetailOpen(false)}>关闭</Button>
              {isProducer && detailTask.masters?.some(m => m.isVerified && !m.confirmedAt) && (
                <Button variant="primary" onClick={() => { setTaskDetailOpen(false); setActiveTab('confirm'); }}>
                  <Play className="w-4 h-4" />
                  试听验收
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={masterDetailOpen} onClose={() => setMasterDetailOpen(false)} title="母带验收" size="md">
        {masterDetail && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-8 h-8 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-semibold text-white truncate">{masterDetail.task?.work?.title || '母带作品'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status="verified" size="sm" />
                  <span className="text-xs text-slate-400">混音师：{masterDetail.task?.assignee?.nickname || masterDetail.task?.assignee?.username || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">格式</span>
                <span className="text-white font-medium">{masterDetail.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">采样率</span>
                <span className="text-emerald-400 font-medium">{(masterDetail.sampleRate / 1000).toFixed(1)} kHz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">位深度</span>
                <span className="text-cyan-400 font-medium">{masterDetail.bitDepth} bit</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">校验状态</span>
                <span className="text-emerald-400 font-medium">✓ 已通过行业标准</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">上传时间</span>
                <span className="text-slate-300 text-sm">{new Date(masterDetail.uploadedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>

            {masterDetail.filePath && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Play className="w-5 h-5 text-violet-400" />
                  <span className="text-white font-medium">试听母带音频</span>
                </div>
                <audio controls className="w-full" src={`http://localhost:3001${masterDetail.filePath.startsWith('/') ? '' : '/'}${masterDetail.filePath}`}>
                  您的浏览器不支持音频播放
                </audio>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1.5 text-violet-400" />
                验收备注（可选）
              </label>
              <textarea
                rows={3}
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="请写下您的验收意见，例如：混音层次清晰、低频饱满，感谢混音师的辛苦工作！"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 resize-none"
              />
              <div className="flex items-start gap-2 mt-2 text-xs text-slate-500">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>确认后任务将标记为完成，混音师可在其工作台看到确认时间和您的备注</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setMasterDetailOpen(false)}>暂不确认</Button>
              <Button variant="primary" onClick={() => handleConfirmMaster(masterDetail.id)} loading={confirmingId === masterDetail.id} disabled={confirmingId === masterDetail.id}>
                <CheckCircle2 className="w-4 h-4" />
                确认验收通过
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl ${toast.type === 'success' ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MixingTasks;
