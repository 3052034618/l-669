import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { MixingService } from '../services/MixingService.js';
import { ApiResponse } from '../../shared/types.js';

const router = Router();

router.use(authMiddleware);

router.get('/available', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || req.user.role !== 'engineer') {
      return res.status(403).json({ success: false, message: '只有混音师可以查看可用任务' });
    }
    
    const tasks = MixingService.getAvailableTasks(req.user.rating);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
});

router.get('/my', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const tasks = MixingService.getMyTasks(req.user.id, req.user.role);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
});

router.get('/mine', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const tasks = MixingService.getMyTasks(req.user.id, req.user.role);
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const taskId = parseInt(req.params.id);
    const task = MixingService.getTaskById(taskId);
    
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取任务详情失败' });
  }
});

router.post('/', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '只有制作人或管理员可以创建任务' });
    }
    
    const { workId, budget, deadline, minRating } = req.body;
    
    if (!workId || !budget || !deadline) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const task = MixingService.createTask(
      parseInt(workId),
      parseFloat(budget),
      deadline,
      minRating || 4.0
    );
    
    if (!task) {
      return res.status(400).json({ success: false, message: '创建任务失败' });
    }
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建任务失败' });
  }
});

router.post('/:id/accept', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || req.user.role !== 'engineer') {
      return res.status(403).json({ success: false, message: '只有混音师可以接受任务' });
    }
    
    const taskId = parseInt(req.params.id);
    const result = MixingService.acceptTask(taskId, req.user.id);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, data: result.task, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '接受任务失败' });
  }
});

router.get('/:id/agreement', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const taskId = parseInt(req.params.id);
    const agreement = MixingService.getAgreement(taskId);
    
    if (!agreement) {
      return res.status(404).json({ success: false, message: '协议不存在' });
    }
    
    res.json({ success: true, data: agreement });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取协议失败' });
  }
});

router.post('/:id/sign', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const taskId = parseInt(req.params.id);
    const role = req.user.role === 'producer' || req.user.role === 'admin' ? 'producer' : 'engineer';
    
    const result = MixingService.signAgreement(taskId, req.user.id, role);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '签署协议失败' });
  }
});

export default router;
