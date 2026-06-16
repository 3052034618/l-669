import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { WorkService } from '../services/WorkService.js';
import { ApiResponse } from '../../shared/types.js';
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'work-' + uniqueSuffix + path.extname(file.originalname));
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
    
    const works = WorkService.getByUserId(req.user.id);
    res.json({ success: true, data: works });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取作品列表失败' });
  }
});

router.post('/', upload.single('melody'), (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['songwriter', 'admin', 'producer'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    const { projectId, title, lyrics } = req.body;
    const melodyPath = req.file?.path || '';
    const originalName = req.file?.originalname || '';
    
    if (!projectId || !title) {
      return res.status(400).json({ success: false, message: '项目ID和作品标题不能为空' });
    }
    
    if (!melodyPath) {
      return res.status(400).json({ success: false, message: '请选择旋律音频文件' });
    }
    
    const work = WorkService.create(
      parseInt(projectId),
      req.user.id,
      title,
      lyrics || '',
      melodyPath
    );
    
    if (!work) {
      return res.status(400).json({ success: false, message: '创建作品失败' });
    }
    
    res.json({ success: true, data: { ...work, originalName } });
  } catch (error) {
    res.status(500).json({ success: false, message: '上传作品失败' });
  }
});

router.get('/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const workId = parseInt(req.params.id);
    const work = WorkService.getById(workId);
    
    if (!work) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }
    
    res.json({ success: true, data: work });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取作品详情失败' });
  }
});

router.post('/:id/check-similarity', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const workId = parseInt(req.params.id);
    const work = WorkService.getById(workId);
    
    if (!work) {
      return res.status(404).json({ success: false, message: '作品不存在' });
    }
    
    const similarity = WorkService.checkSimilarityById(workId);
    const isLocked = similarity > 70;
    
    if (isLocked && !work.isLocked) {
      const { run } = require('../db/database.js');
      run('UPDATE works SET is_locked = 1, similarity_score = ? WHERE id = ?', [similarity, workId]);
      
      const { NotificationService } = require('../services/NotificationService.js');
      const { AuthService } = require('../services/AuthService.js');
      
      if (work.uploaderId) {
        NotificationService.create(
          work.uploaderId,
          'upload',
          '作品相似度检测异常',
          `您的作品「${work.title}」旋律相似度达${similarity}%，已被锁定`,
          `work:${workId}`
        );
      }
      
      const admins = AuthService.getAll('admin');
      admins.forEach((admin: any) => {
        NotificationService.create(
          admin.id,
          'upload',
          '疑似重复作品',
          `作品「${work.title}」旋律相似度达${similarity}%，已被锁定`,
          `work:${workId}`
        );
      });
    }
    
    res.json({ 
      success: true, 
      data: { 
        similarity, 
        isLocked,
        message: isLocked ? '旋律相似度超过70%，文件已锁定' : '旋律相似度正常'
      } 
    });
  } catch (error) {
    console.error('Similarity check error:', error);
    res.status(500).json({ success: false, message: '检测失败' });
  }
});

export default router;
