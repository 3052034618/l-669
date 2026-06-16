import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { RoyaltyService } from '../services/RoyaltyService.js';
import { ApiResponse } from '../../shared/types.js';

const router = Router();

router.use(authMiddleware);

router.get('/splits/:workId', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const workId = parseInt(req.params.workId);
    const splits = RoyaltyService.getSplits(workId);
    
    res.json({ success: true, data: splits });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取分成设置失败' });
  }
});

router.put('/splits/:workId', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || !['producer', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: '只有制作人或管理员可以设置分成' });
    }
    
    const workId = parseInt(req.params.workId);
    const { splits } = req.body;
    
    if (!splits || !Array.isArray(splits)) {
      return res.status(400).json({ success: false, message: '分成数据格式错误' });
    }
    
    const result = RoyaltyService.setSplit(workId, splits);
    
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(500).json({ success: false, message: '设置分成失败' });
  }
});

router.get('/calculate/:workId', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const workId = parseInt(req.params.workId);
    const { totalRevenue } = req.query;
    
    if (!totalRevenue) {
      return res.status(400).json({ success: false, message: '请提供总收益' });
    }
    
    const result = RoyaltyService.calculateRevenue(workId, parseFloat(totalRevenue as string));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: '计算收益失败' });
  }
});

router.get('/reports', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { workId, month } = req.query;
    const reports = RoyaltyService.getReports(
      workId ? parseInt(workId as string) : undefined,
      month as string
    );
    
    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取报告列表失败' });
  }
});

router.get('/reports/:id', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    const reportId = parseInt(req.params.id);
    const report = RoyaltyService.getReportById(reportId);
    
    if (!report) {
      return res.status(404).json({ success: false, message: '报告不存在' });
    }
    
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取报告详情失败' });
  }
});

router.post('/reports/generate', (req: AuthRequest, res: Response<ApiResponse<any>>) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '只有管理员可以生成报告' });
    }
    
    const { workId, month } = req.body;
    
    if (!workId || !month) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const report = RoyaltyService.generateReport(parseInt(workId), month);
    
    if (!report) {
      return res.status(400).json({ success: false, message: '生成报告失败' });
    }
    
    res.json({ success: true, data: report, message: '报告生成成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '生成报告失败' });
  }
});

export default router;
