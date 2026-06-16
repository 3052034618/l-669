import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { MasterService } from '../services/MasterService.js';
import { ApiResponse } from '../../shared/types.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'master-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const masters = MasterService.getByUserId(req.user.id, req.user.role);
    res.json({ success: true, data: masters });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取母带列表失败' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const masterId = parseInt(req.params.id);
    const master = MasterService.getById(masterId);
    
    if (!master) {
      return res.status(404).json({ success: false, message: '母带不存在' });
    }
    
    res.json({ success: true, data: master });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取母带详情失败' });
  }
});

router.post('/:taskId', upload.single('master'), async (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || req.user.role !== 'engineer') {
      return res.status(403).json({ success: false, message: '只有混音师可以上传母带' });
    }
    
    const taskId = parseInt(req.params.taskId);
    const filePath = req.file?.path || '';
    const originalName = req.file?.originalname || '';
    
    if (!filePath) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }
    
    const result = await MasterService.upload(taskId, filePath, originalName);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, data: result.master, message: result.message });
  } catch (error) {
    console.error('Master upload error:', error);
    res.status(500).json({ success: false, message: '上传母带失败' });
  }
});

router.post('/:id/verify', async (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { filename } = req.body;
    const master = MasterService.getById(parseInt(req.params.id));
    if (!master) {
      return res.status(404).json({ success: false, message: '母带不存在' });
    }
    const result = await MasterService.verifyAudio(master.filePath, filename || 'audio.wav');
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, message: '检测失败' });
  }
});

router.post('/:id/confirm', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '只有制作人或管理员可以确认母带' });
    }
    
    const masterId = parseInt(req.params.id);
    const { confirmNote } = req.body;
    const result = MasterService.confirm(masterId, req.user.id, confirmNote || '');
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '确认母带失败' });
  }
});

export default router;
