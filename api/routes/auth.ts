import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { LoginRequest, RegisterRequest, ApiResponse } from '../../shared/types.js';

const router = Router();

router.post('/login', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { email, password } = req.body as LoginRequest;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: '请输入邮箱和密码' });
    }
    
    const result = await AuthService.login({ email, password });
    
    if (!result) {
      return res.status(401).json({ success: false, message: '邮箱或密码错误' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

router.post('/register', async (req: Request, res: Response<ApiResponse<any>>) => {
  try {
    const { email, password, name, role } = req.body as RegisterRequest;
    
    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    
    const validRoles = ['producer', 'engineer', 'songwriter'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: '无效的角色类型' });
    }
    
    const result = await AuthService.register({ email, password, name, role });
    
    if (!result) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册' });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未登录' });
    }
    
    const user = AuthService.getById(req.user.id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

router.get('/users', authMiddleware, (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: '权限不足' });
    }
    
    const { role } = req.query;
    const users = AuthService.getAll(role as any);
    
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户列表失败' });
  }
});

export default router;
