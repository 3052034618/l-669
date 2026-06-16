import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { ProjectService } from '../services/ProjectService.js';
import { WorkService } from '../services/WorkService.js';
import { ApiResponse } from '../../shared/types.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const projects = ProjectService.getByUserId(req.user.id);
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取项目列表失败' });
  }
});

router.post('/', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '只有制作人或管理员可以创建项目' });
    }
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '项目名称不能为空' });
    }
    
    const project = ProjectService.create(req.user.id, name, description || '');
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建项目失败' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = ProjectService.getById(projectId);
    
    if (!project) {
      return res.status(404).json({ success: false, message: '项目不存在' });
    }
    
    const isMember = project.members?.some(m => m.userId === req.user?.id);
    const isCreator = project.creatorId === req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    if (!isMember && !isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: '您没有权限访问此项目' });
    }
    
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取项目详情失败' });
  }
});

router.post('/:id/members', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    const projectId = parseInt(req.params.id);
    const { userId, role, permissions } = req.body;
    
    if (!userId || !role || !permissions) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const member = ProjectService.addMember(projectId, userId, role, permissions);
    
    if (!member) {
      return res.status(400).json({ success: false, message: '该用户已在项目中' });
    }
    
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ success: false, message: '添加成员失败' });
  }
});

router.put('/:id/members/:userId', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    const projectId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const { permissions } = req.body;
    
    if (!permissions) {
      return res.status(400).json({ success: false, message: '权限不能为空' });
    }
    
    const result = ProjectService.updateMemberPermissions(projectId, userId, permissions);
    
    if (!result) {
      return res.status(400).json({ success: false, message: '更新权限失败' });
    }
    
    res.json({ success: true, message: '权限更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新权限失败' });
  }
});

router.get('/:id/backups', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const projectId = parseInt(req.params.id);
    const backups = ProjectService.getBackups(projectId);
    
    res.json({ success: true, data: backups });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取备份记录失败' });
  }
});

router.get('/:id/works', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const projectId = parseInt(req.params.id);
    const works = WorkService.getByProjectId(projectId);
    
    res.json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取作品列表失败' });
  }
});

export default router;
