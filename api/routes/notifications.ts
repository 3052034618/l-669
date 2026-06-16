import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/NotificationService.js';
import { ApiResponse } from '../../shared/types.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const { limit } = req.query;
    const notifications = NotificationService.getByUserId(
      req.user.id,
      limit ? parseInt(limit as string) : 50
    );
    
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取通知列表失败' });
  }
});

router.get('/unread-count', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const count = NotificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取未读数量失败' });
  }
});

router.put('/:id/read', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const id = parseInt(req.params.id);
    const result = NotificationService.markAsRead(id);
    
    if (!result) {
      return res.status(404).json({ success: false, message: '通知不存在' });
    }
    
    res.json({ success: true, message: '标记已读成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '标记已读失败' });
  }
});

router.put('/read-all', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    NotificationService.markAllAsRead(req.user.id);
    res.json({ success: true, message: '全部标记已读成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '标记已读失败' });
  }
});

export default router;
