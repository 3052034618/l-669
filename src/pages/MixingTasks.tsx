import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Star, Music, Upload, FileCheck, CheckCircle2, AlertCircle, Headphones, Play, Volume2 } from 'lucide-react';
import { Card, Button, Modal, StatusBadge } from '../components/Card.js';
import { mixingApi, masterApi } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import type { MixingTask, Master } from '../../shared/types.js';

type TabType = 'available' | 'my' | 'confirm';

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
          setMyTasks(response.data);
        }
      } else if (activeTab === 'confirm') {
        const response = await masterApi.getMasters();
        if (response.success && response.data) {
          setPendingMasters(response.data.filter((m: Master) => m.isVerified && m.task?.status !== 'completed'));
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
    setMasterDetailOpen(true);
  };

  const handleConfirmMaster = async (masterId: number) => {
    setConfirmingId(masterId);
    try {
      const response = await masterApi.confirmMaster(masterId);
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

  const getProgress = (status: string) => {
    switch (status) {
      case 'assigned': return 25;
      case 'in_progress': return 50;
      case 'completed': return 100;
      default: return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const isEngineer = user?.role === 'engineer';
  const isProducer = user?.role === 'producer' || user?.role === 'admin';

  const renderTaskCard = (task: MixingTask, isAvailable: boolean) => {
    const canAccept = canAcceptTask(task);
    const disabledReason = getAcceptDisabledReason(task);
    const progress = getProgress(task.status);

    return (
      <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card hover className="p-6 h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white truncate">{task.work?.title || '未命名作品'}</h3>
              </div>
              <StatusBadge status={task.status} size="sm" />
            </div>
          </div>

          <div className="space-y-3 mb-5">
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
            <div className="flex items-center gap-2 text-slate-300">
              <Star className="w-4 h-4 text-cyan-400" />
              <span className="text-sm">最低评分：</span>
              <span className="text-cyan-400 font-medium">{task.minRatingRequired.toFixed(1)}</span>
            </div>
          </div>

          {!isAvailable && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">任务进度</span>
                <span className="text-sm text-violet-400 font-medium">{progress}%</span>
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
          )}

          <div className="flex flex-wrap gap-2">
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
                <Button variant="outline" size="sm" onClick={() => handleOpenAgreement(task)}>
                  <FileCheck className="w-4 h-4" />
                  协议
                </Button>
                {isEngineer && task.status === 'in_progress' && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenUpload(task)}>
                    <Upload className="w-4 h-4" />
                    上传母带
                  </Button>
                )}
              </>
            )}
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

  const currentTasks = activeTab === 'available' ? availableTasks : myTasks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">混音任务</h1>
          <p className="text-slate-400">浏览可接任务或管理您的混音项目</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="flex gap-2 mb-8 bg-slate-800/50 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('available')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'available' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            可接任务
          </button>
          <button onClick={() => setActiveTab('my')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'my' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
            我的任务
          </button>
          {isProducer && (
            <button onClick={() => setActiveTab('confirm')} className={`px-6 py-2.5 rounded-xl font-medium transition-all duration-200 ${activeTab === 'confirm' ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
              待确认母带
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
              <p className="text-slate-400">混音师上传的母带将在这里等待您的确认</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingMasters.map((master) => renderMasterCard(master))}
            </div>
          )
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

      <Modal isOpen={masterDetailOpen} onClose={() => setMasterDetailOpen(false)} title="母带详情与确认" size="md">
        {masterDetail && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-8 h-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">{masterDetail.task?.work?.title || '母带作品'}</h3>
                <StatusBadge status="verified" size="sm" />
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
                <span className="text-emerald-400 font-medium">✓ 已通过</span>
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
                  <span className="text-white font-medium">试听母带</span>
                </div>
                <audio controls className="w-full" src={`http://localhost:3001${masterDetail.filePath.startsWith('/') ? '' : '/'}${masterDetail.filePath}`}>
                  您的浏览器不支持音频播放
                </audio>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setMasterDetailOpen(false)}>取消</Button>
              <Button variant="primary" onClick={() => handleConfirmMaster(masterDetail.id)} loading={confirmingId === masterDetail.id} disabled={confirmingId === masterDetail.id}>
                <CheckCircle2 className="w-4 h-4" />
                确认通过
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
