import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreHorizontal, Users, Clock, FolderPlus } from 'lucide-react';
import { Card, Button, Modal, StatusBadge } from '../components/Card.js';
import { projectApi } from '../api/client.js';
import type { Project } from '../../shared/types.js';

interface MockProject extends Project {
  progress: number;
}

const mockMembers = [
  { id: 1, email: 'zhangming@example.com', name: '张明', role: 'producer' as const, avatar: 'https://i.pravatar.cc/150?img=1', rating: 4.8, currentLoad: 60, createdAt: '2023-06-01T00:00:00Z' },
  { id: 2, email: 'lihua@example.com', name: '李华', role: 'engineer' as const, avatar: 'https://i.pravatar.cc/150?img=2', rating: 4.5, currentLoad: 75, createdAt: '2023-06-15T00:00:00Z' },
  { id: 3, email: 'wangfang@example.com', name: '王芳', role: 'songwriter' as const, avatar: 'https://i.pravatar.cc/150?img=3', rating: 4.9, currentLoad: 40, createdAt: '2023-07-01T00:00:00Z' },
  { id: 4, email: 'zhaoqiang@example.com', name: '赵强', role: 'engineer' as const, avatar: 'https://i.pravatar.cc/150?img=4', rating: 4.2, currentLoad: 85, createdAt: '2023-07-15T00:00:00Z' },
  { id: 5, email: 'liuwei@example.com', name: '刘伟', role: 'producer' as const, avatar: 'https://i.pravatar.cc/150?img=5', rating: 4.7, currentLoad: 55, createdAt: '2023-08-01T00:00:00Z' },
  { id: 6, email: 'chenjing@example.com', name: '陈静', role: 'songwriter' as const, avatar: 'https://i.pravatar.cc/150?img=6', rating: 4.6, currentLoad: 30, createdAt: '2023-08-15T00:00:00Z' },
];

const mockProjects: MockProject[] = [
  {
    id: 1,
    creatorId: 1,
    name: '夏日恋歌',
    description: '一张充满夏日气息的流行专辑，收录10首原创歌曲',
    status: 'active',
    progress: 65,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-03-20T14:20:00Z',
    members: [
      { id: 1, projectId: 1, userId: 1, role: 'producer', permissions: ['all'], joinedAt: '2024-01-15T10:30:00Z', user: mockMembers[0] },
      { id: 2, projectId: 1, userId: 2, role: 'engineer', permissions: ['edit'], joinedAt: '2024-01-16T09:00:00Z', user: mockMembers[1] },
      { id: 3, projectId: 1, userId: 3, role: 'songwriter', permissions: ['view'], joinedAt: '2024-01-18T11:00:00Z', user: mockMembers[2] },
      { id: 4, projectId: 1, userId: 4, role: 'engineer', permissions: ['edit'], joinedAt: '2024-02-01T10:00:00Z', user: mockMembers[3] },
    ],
  },
  {
    id: 2,
    creatorId: 2,
    name: '城市夜曲',
    description: '都市情感主题的原创单曲，融合R&B和电子元素',
    status: 'active',
    progress: 40,
    createdAt: '2024-02-10T08:00:00Z',
    updatedAt: '2024-03-18T16:45:00Z',
    members: [
      { id: 5, projectId: 2, userId: 2, role: 'producer', permissions: ['all'], joinedAt: '2024-02-10T08:00:00Z', user: mockMembers[1] },
      { id: 6, projectId: 2, userId: 5, role: 'songwriter', permissions: ['edit'], joinedAt: '2024-02-12T10:00:00Z', user: mockMembers[4] },
    ],
  },
  {
    id: 3,
    creatorId: 3,
    name: '民谣精选',
    description: '经典民谣翻唱专辑，回归纯粹的音乐本质',
    status: 'completed',
    progress: 100,
    createdAt: '2023-11-05T14:00:00Z',
    updatedAt: '2024-02-28T20:00:00Z',
    members: [
      { id: 7, projectId: 3, userId: 3, role: 'producer', permissions: ['all'], joinedAt: '2023-11-05T14:00:00Z', user: mockMembers[2] },
      { id: 8, projectId: 3, userId: 1, role: 'engineer', permissions: ['edit'], joinedAt: '2023-11-06T09:00:00Z', user: mockMembers[0] },
      { id: 9, projectId: 3, userId: 6, role: 'songwriter', permissions: ['view'], joinedAt: '2023-11-10T11:00:00Z', user: mockMembers[5] },
    ],
  },
  {
    id: 4,
    creatorId: 4,
    name: '电音未来',
    description: '实验性电子音乐项目，探索声音的无限可能',
    status: 'active',
    progress: 25,
    createdAt: '2024-03-01T12:00:00Z',
    updatedAt: '2024-03-19T10:30:00Z',
    members: [
      { id: 10, projectId: 4, userId: 4, role: 'producer', permissions: ['all'], joinedAt: '2024-03-01T12:00:00Z', user: mockMembers[3] },
    ],
  },
  {
    id: 5,
    creatorId: 5,
    name: '摇滚复兴',
    description: '致敬经典摇滚时代的原创专辑，充满力量与激情',
    status: 'active',
    progress: 80,
    createdAt: '2023-12-20T09:00:00Z',
    updatedAt: '2024-03-21T15:00:00Z',
    members: [
      { id: 11, projectId: 5, userId: 5, role: 'producer', permissions: ['all'], joinedAt: '2023-12-20T09:00:00Z', user: mockMembers[4] },
      { id: 12, projectId: 5, userId: 1, role: 'engineer', permissions: ['edit'], joinedAt: '2023-12-22T10:00:00Z', user: mockMembers[0] },
      { id: 13, projectId: 5, userId: 2, role: 'engineer', permissions: ['edit'], joinedAt: '2024-01-05T11:00:00Z', user: mockMembers[1] },
      { id: 14, projectId: 5, userId: 3, role: 'songwriter', permissions: ['view'], joinedAt: '2024-01-10T09:00:00Z', user: mockMembers[2] },
      { id: 15, projectId: 5, userId: 6, role: 'songwriter', permissions: ['view'], joinedAt: '2024-01-15T14:00:00Z', user: mockMembers[5] },
    ],
  },
  {
    id: 6,
    creatorId: 6,
    name: '轻音乐集',
    description: '治愈系轻音乐作品集，适合放松和冥想',
    status: 'archived',
    progress: 100,
    createdAt: '2023-09-10T10:00:00Z',
    updatedAt: '2023-12-15T18:00:00Z',
    members: [
      { id: 16, projectId: 6, userId: 6, role: 'producer', permissions: ['all'], joinedAt: '2023-09-10T10:00:00Z', user: mockMembers[5] },
      { id: 17, projectId: 6, userId: 4, role: 'engineer', permissions: ['edit'], joinedAt: '2023-09-12T08:00:00Z', user: mockMembers[3] },
    ],
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

export default function Projects() {
  const [projects, setProjects] = useState<MockProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await projectApi.getProjects();
        if (response.success && response.data) {
          const projectsWithProgress = response.data.map((p, index) => ({
            ...p,
            progress: mockProjects[index]?.progress || Math.floor(Math.random() * 100),
            members: mockProjects[index]?.members || [],
          }));
          setProjects(projectsWithProgress);
        } else {
          setProjects(mockProjects);
        }
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setProjects(mockProjects);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      setCreating(true);
      const response = await projectApi.createProject(newProject);
      if (response.success && response.data) {
        const createdProject: MockProject = {
          ...response.data,
          progress: 0,
          members: [],
        };
        setProjects([createdProject, ...projects]);
        setNewProject({ name: '', description: '' });
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      const createdProject: MockProject = {
        id: Date.now(),
        creatorId: 1,
        name: newProject.name,
        description: newProject.description,
        status: 'active',
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
      };
      setProjects([createdProject, ...projects]);
      setNewProject({ name: '', description: '' });
      setIsModalOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleProjectClick = (project: Project) => {
    console.log('Navigate to project:', project.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-cyan-500';
    if (progress >= 20) return 'bg-violet-500';
    return 'bg-amber-500';
  };

  return (
    <div className="min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">项目管理</h1>
        <p className="text-slate-400">管理您的所有音乐项目，追踪创作进度</p>
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
            placeholder="搜索项目..."
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
            <option value="all">全部状态</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="archived">已归档</option>
          </select>

          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">创建项目</span>
          </Button>
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
          {filteredProjects.map((project) => (
            <motion.div key={project.id} variants={itemVariants}>
              <Card
                hover
                gradient
                className="p-6 h-full flex flex-col"
                onClick={() => handleProjectClick(project)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
                      <FolderPlus className="w-6 h-6 text-violet-400" />
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">{project.name}</h3>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2 flex-1">
                  {project.description}
                </p>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">项目进度</span>
                    <span className="text-xs font-medium text-white">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className={`h-full rounded-full ${getProgressColor(project.progress)}`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <div className="flex -space-x-2">
                      {project.members?.slice(0, 3).map((member) => (
                        <div
                          key={member.id}
                          className="w-7 h-7 rounded-full border-2 border-slate-800 overflow-hidden"
                        >
                          <img
                            src={member.user?.avatar || `https://i.pravatar.cc/150?img=${member.userId}`}
                            alt={member.user?.name || 'Member'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {project.members && project.members.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-slate-300">
                            +{project.members.length - 3}
                          </span>
                        </div>
                      )}
                      {(!project.members || project.members.length === 0) && (
                        <span className="text-xs text-slate-400">暂无成员</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && filteredProjects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-800/50 flex items-center justify-center">
            <FolderPlus className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无项目</h3>
          <p className="text-slate-400 mb-6">
            {searchQuery || filterStatus !== 'all'
              ? '没有找到匹配的项目，请尝试其他搜索条件'
              : '创建您的第一个音乐项目，开始创作之旅'}
          </p>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5" />
            创建项目
          </Button>
        </motion.div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="创建新项目"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              项目名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              placeholder="输入项目名称"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              项目描述
            </label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              placeholder="描述您的项目..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setNewProject({ name: '', description: '' });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProject.name.trim() || creating}
              loading={creating}
            >
              创建项目
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
