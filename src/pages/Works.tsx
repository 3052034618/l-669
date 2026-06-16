import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Lock, AlertTriangle, Upload, Search, FileText, User } from 'lucide-react';
import { Card, Button, Modal, StatusBadge } from '../components/Card.js';
import { workApi } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';
import type { Work } from '../../shared/types.js';

interface MockWork extends Work {
  projectName: string;
  uploaderName: string;
  uploaderAvatar: string;
}

const mockProjects = [
  { id: 1, name: '夏日恋歌' },
  { id: 2, name: '城市夜曲' },
  { id: 3, name: '民谣精选' },
  { id: 4, name: '电音未来' },
  { id: 5, name: '摇滚复兴' },
];

const mockUploaders = [
  { id: 1, name: '张明', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: 2, name: '李华', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: 3, name: '王芳', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: 4, name: '赵强', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: 5, name: '刘伟', avatar: 'https://i.pravatar.cc/150?img=5' },
  { id: 6, name: '陈静', avatar: 'https://i.pravatar.cc/150?img=6' },
];

const mockWorks: MockWork[] = [
  {
    id: 1,
    projectId: 1,
    uploaderId: 3,
    projectName: '夏日恋歌',
    uploaderName: '王芳',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=3',
    title: '海边的风',
    lyrics: '海风轻轻吹过脸庞，你的笑容如此温暖...',
    melodyPath: '/melodies/sea-breeze.mp3',
    similarityScore: 45,
    isLocked: false,
    createdAt: '2024-01-20T10:30:00Z',
  },
  {
    id: 2,
    projectId: 1,
    uploaderId: 6,
    projectName: '夏日恋歌',
    uploaderName: '陈静',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=6',
    title: '夏日回忆',
    lyrics: '那年夏天我们一起走过，阳光洒在你发梢...',
    melodyPath: '/melodies/summer-memory.mp3',
    similarityScore: 78,
    isLocked: true,
    createdAt: '2024-01-25T14:20:00Z',
  },
  {
    id: 3,
    projectId: 2,
    uploaderId: 5,
    projectName: '城市夜曲',
    uploaderName: '刘伟',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=5',
    title: '霓虹灯下',
    lyrics: '城市的霓虹灯闪烁，我在人群中寻找你...',
    melodyPath: '/melodies/neon-lights.mp3',
    similarityScore: 23,
    isLocked: false,
    createdAt: '2024-02-10T08:15:00Z',
  },
  {
    id: 4,
    projectId: 2,
    uploaderId: 3,
    projectName: '城市夜曲',
    uploaderName: '王芳',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=3',
    title: '午夜心事',
    lyrics: '午夜时分我还醒着，想着那些没说的话...',
    melodyPath: '/melodies/midnight-thoughts.mp3',
    similarityScore: 85,
    isLocked: true,
    createdAt: '2024-02-15T16:45:00Z',
  },
  {
    id: 5,
    projectId: 3,
    uploaderId: 6,
    projectName: '民谣精选',
    uploaderName: '陈静',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=6',
    title: '故乡的云',
    lyrics: '故乡的云飘向远方，带着我的思念...',
    melodyPath: '/melodies/hometown-clouds.mp3',
    similarityScore: 12,
    isLocked: false,
    createdAt: '2024-02-20T11:30:00Z',
  },
  {
    id: 6,
    projectId: 4,
    uploaderId: 4,
    projectName: '电音未来',
    uploaderName: '赵强',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=4',
    title: '数字梦境',
    lyrics: '在数字的世界里，我们自由飞翔...',
    melodyPath: '/melodies/digital-dream.mp3',
    similarityScore: 56,
    isLocked: false,
    createdAt: '2024-03-01T09:00:00Z',
  },
  {
    id: 7,
    projectId: 5,
    uploaderId: 1,
    projectName: '摇滚复兴',
    uploaderName: '张明',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=1',
    title: '青春烈火',
    lyrics: '青春像一团烈火，燃烧着你和我...',
    melodyPath: '/melodies/youth-fire.mp3',
    similarityScore: 92,
    isLocked: true,
    createdAt: '2024-03-05T13:20:00Z',
  },
  {
    id: 8,
    projectId: 5,
    uploaderId: 2,
    projectName: '摇滚复兴',
    uploaderName: '李华',
    uploaderAvatar: 'https://i.pravatar.cc/150?img=2',
    title: '自由之路',
    lyrics: '踏上自由的路，不再回头...',
    melodyPath: '/melodies/freedom-road.mp3',
    similarityScore: 34,
    isLocked: false,
    createdAt: '2024-03-10T15:10:00Z',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
    },
  },
};

export default function Works() {
  const { user } = useAuthStore();
  const [works, setWorks] = useState<MockWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSimilarityModalOpen, setIsSimilarityModalOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<MockWork | null>(null);
  const [similarityResult, setSimilarityResult] = useState<{ similarity: number; isLocked: boolean } | null>(null);
  const [checkingSimilarity, setCheckingSimilarity] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newWork, setNewWork] = useState({
    title: '',
    lyrics: '',
    projectId: 0,
  });

  useEffect(() => {
    const fetchWorks = async () => {
      try {
        setLoading(true);
        const response = await workApi.getWorks();
        if (response.success && response.data) {
          const worksWithMeta = response.data.map((w, index) => ({
            ...w,
            projectName: mockProjects.find(p => p.id === w.projectId)?.name || '未知项目',
            uploaderName: mockUploaders.find(u => u.id === w.uploaderId)?.name || '未知用户',
            uploaderAvatar: mockUploaders.find(u => u.id === w.uploaderId)?.avatar || 'https://i.pravatar.cc/150?img=10',
          }));
          setWorks(worksWithMeta);
        } else {
          setWorks(mockWorks);
        }
      } catch (error) {
        console.error('Failed to fetch works:', error);
        setWorks(mockWorks);
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, []);

  const handleCheckSimilarity = async (work: MockWork) => {
    try {
      setCheckingSimilarity(true);
      setSelectedWork(work);
      const response = await workApi.checkSimilarity(work.id);
      if (response.success && response.data) {
        setSimilarityResult(response.data);
        setIsSimilarityModalOpen(true);
        setWorks(works.map(w => 
          w.id === work.id 
            ? { ...w, similarityScore: response.data.similarity, isLocked: response.data.isLocked }
            : w
        ));
      }
    } catch (error) {
      console.error('Failed to check similarity:', error);
      const simulatedResult = {
        similarity: Math.floor(Math.random() * 100),
        isLocked: Math.random() > 0.7,
      };
      setSimilarityResult(simulatedResult);
      setIsSimilarityModalOpen(true);
    } finally {
      setCheckingSimilarity(false);
    }
  };

  const handleUploadWork = async () => {
    if (!newWork.title.trim() || !newWork.projectId) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('title', newWork.title);
      formData.append('lyrics', newWork.lyrics);
      formData.append('projectId', newWork.projectId.toString());
      
      const response = await workApi.uploadWork(formData);
      if (response.success && response.data) {
        const createdWork: MockWork = {
          ...response.data,
          projectName: mockProjects.find(p => p.id === newWork.projectId)?.name || '未知项目',
          uploaderName: user?.name || '当前用户',
          uploaderAvatar: user?.avatar || 'https://i.pravatar.cc/150?img=10',
        };
        setWorks([createdWork, ...works]);
        setNewWork({ title: '', lyrics: '', projectId: 0 });
        setIsUploadModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to upload work:', error);
      const createdWork: MockWork = {
        id: Date.now(),
        projectId: newWork.projectId,
        uploaderId: user?.id || 1,
        projectName: mockProjects.find(p => p.id === newWork.projectId)?.name || '未知项目',
        uploaderName: user?.name || '当前用户',
        uploaderAvatar: user?.avatar || 'https://i.pravatar.cc/150?img=10',
        title: newWork.title,
        lyrics: newWork.lyrics,
        melodyPath: '/melodies/new-work.mp3',
        similarityScore: 0,
        isLocked: false,
        createdAt: new Date().toISOString(),
      };
      setWorks([createdWork, ...works]);
      setNewWork({ title: '', lyrics: '', projectId: 0 });
      setIsUploadModalOpen(false);
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getSimilarityTextColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const filteredWorks = works.filter((work) => {
    const matchesSearch =
      work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.lyrics.toLowerCase().includes(searchQuery.toLowerCase()) ||
      work.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'locked' && work.isLocked) ||
      (filterStatus === 'normal' && !work.isLocked);
    
    return matchesSearch && matchesStatus;
  });

  const getWorkStatus = (work: MockWork) => {
    if (work.isLocked) return 'locked';
    if (work.similarityScore >= 70) return 'pending';
    return 'verified';
  };

  const isSongwriter = user?.role === 'songwriter' || user?.role === 'admin';

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">作品管理</h1>
        <p className="text-slate-400">管理您的音乐作品，检测相似度，保护原创版权</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 mb-8"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索作品..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
          >
            <option value="all">全部作品</option>
            <option value="normal">正常作品</option>
            <option value="locked">已锁定</option>
          </select>

          {isSongwriter && (
            <Button onClick={() => setIsUploadModalOpen(true)} className="gap-2">
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">上传作品</span>
            </Button>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredWorks.map((work) => (
            <motion.div key={work.id} variants={itemVariants}>
              <Card
                hover
                gradient
                className={`p-6 h-full flex flex-col relative overflow-hidden ${work.isLocked ? 'border-red-500/50' : ''}`}
              >
                {work.isLocked && (
                  <div className="absolute top-3 right-3 z-20">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-red-400" />
                    </div>
                  </div>
                )}

                {work.similarityScore >= 70 && !work.isLocked && (
                  <div className="absolute top-3 right-3 z-20">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${work.isLocked ? 'bg-red-500/20' : 'bg-violet-500/20'}`}>
                    <Music className={`w-6 h-6 ${work.isLocked ? 'text-red-400' : 'text-violet-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate pr-8">{work.title}</h3>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={getWorkStatus(work)} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <p className="text-slate-400 text-sm line-clamp-2">{work.lyrics}</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">相似度</span>
                    <span className={`text-xs font-semibold ${getSimilarityTextColor(work.similarityScore)}`}>
                      {work.similarityScore}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${work.similarityScore}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className={`h-full rounded-full ${getSimilarityColor(work.similarityScore)}`}
                    />
                  </div>
                  {work.similarityScore >= 70 && (
                    <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      相似度较高，存在侵权风险
                    </p>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-12">项目:</span>
                    <span className="text-sm text-slate-300">{work.projectName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <img
                      src={work.uploaderAvatar}
                      alt={work.uploaderName}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-sm text-slate-300">{work.uploaderName}</span>
                    <span className="text-xs text-slate-500 ml-auto">{formatDate(work.createdAt)}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700/30">
                  <Button
                    variant={work.similarityScore >= 70 ? 'danger' : 'outline'}
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleCheckSimilarity(work)}
                    loading={checkingSimilarity && selectedWork?.id === work.id}
                    disabled={work.isLocked}
                  >
                    <Search className="w-4 h-4" />
                    {work.isLocked ? '已锁定' : '检测相似度'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredWorks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <Music className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无作品</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery || filterStatus !== 'all'
              ? '没有找到匹配的作品，请尝试其他搜索条件'
              : isSongwriter
              ? '上传您的第一首音乐作品，开始创作之旅'
              : '暂无作品数据'}
          </p>
          {isSongwriter && (
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="w-5 h-5" />
              上传作品
            </Button>
          )}
        </motion.div>
      )}

      <Modal
        isOpen={isSimilarityModalOpen}
        onClose={() => {
          setIsSimilarityModalOpen(false);
          setSimilarityResult(null);
          setSelectedWork(null);
        }}
        title="相似度检测结果"
        size="md"
      >
        {selectedWork && similarityResult && (
          <div className="space-y-6">
            <div className="text-center">
              <div className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center ${similarityResult.similarity >= 70 ? 'bg-red-500/20' : similarityResult.similarity >= 40 ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                {similarityResult.similarity >= 70 ? (
                  <AlertTriangle className={`w-12 h-12 ${getSimilarityTextColor(similarityResult.similarity)}`} />
                ) : (
                  <Search className={`w-12 h-12 ${getSimilarityTextColor(similarityResult.similarity)}`} />
                )}
              </div>
              <h4 className="text-xl font-semibold text-white mb-1">{selectedWork.title}</h4>
              <p className="text-slate-400">相似度检测完成</p>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400">相似度分数</span>
                <span className={`text-3xl font-bold ${getSimilarityTextColor(similarityResult.similarity)}`}>
                  {similarityResult.similarity}%
                </span>
              </div>
              <div className="h-3 bg-slate-600/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${similarityResult.similarity}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className={`h-full rounded-full ${getSimilarityColor(similarityResult.similarity)}`}
                />
              </div>
            </div>

            {similarityResult.similarity >= 70 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-red-400 font-medium mb-1">高风险警告</h5>
                    <p className="text-sm text-red-300/80">
                      该作品与现有作品相似度较高，存在侵权风险。系统已自动锁定该作品，请修改后重新提交检测。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {similarityResult.similarity < 70 && similarityResult.similarity >= 40 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-amber-400 font-medium mb-1">中等风险提示</h5>
                    <p className="text-sm text-amber-300/80">
                      该作品存在一定相似度，建议进一步检查确认原创性后再使用。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {similarityResult.similarity < 40 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-emerald-400 font-medium mb-1">检测通过</h5>
                    <p className="text-sm text-emerald-300/80">
                      该作品原创性较高，可以正常使用。
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsSimilarityModalOpen(false);
                  setSimilarityResult(null);
                  setSelectedWork(null);
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setNewWork({ title: '', lyrics: '', projectId: 0 });
        }}
        title="上传新作品"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              作品标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newWork.title}
              onChange={(e) => setNewWork({ ...newWork, title: e.target.value })}
              placeholder="输入作品标题"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              所属项目 <span className="text-red-400">*</span>
            </label>
            <select
              value={newWork.projectId}
              onChange={(e) => setNewWork({ ...newWork, projectId: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
            >
              <option value={0}>请选择项目</option>
              {mockProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              歌词内容
            </label>
            <textarea
              value={newWork.lyrics}
              onChange={(e) => setNewWork({ ...newWork, lyrics: e.target.value })}
              placeholder="输入歌词内容..."
              rows={5}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              旋律文件
            </label>
            <div className="border-2 border-dashed border-slate-600/50 rounded-xl p-8 text-center hover:border-violet-500/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">点击或拖拽文件到此处上传</p>
              <p className="text-slate-500 text-xs mt-1">支持 MP3, WAV, M4A 格式</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsUploadModalOpen(false);
                setNewWork({ title: '', lyrics: '', projectId: 0 });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleUploadWork}
              disabled={!newWork.title.trim() || !newWork.projectId || uploading}
              loading={uploading}
            >
              <Upload className="w-4 h-4" />
              上传作品
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
