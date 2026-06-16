import { run, get, all } from '../db/database.js';
import { RoyaltySplit, RoyaltyReport } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { WorkService } from './WorkService.js';
import { NotificationService } from './NotificationService.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RoyaltyService {
  static setSplit(workId: number, splits: { userId: number; percentage: number }[]): { success: boolean; message: string } {
    const work = WorkService.getById(workId);
    if (!work) {
      return { success: false, message: '作品不存在' };
    }
    
    const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return { success: false, message: `分成比例总和必须为100%，当前为${totalPercentage}%` };
    }
    
    run('DELETE FROM royalty_splits WHERE work_id = ?', [workId]);
    
    const insertSql = `
      INSERT INTO royalty_splits (work_id, user_id, percentage)
      VALUES (?, ?, ?)
    `;
    
    splits.forEach(split => {
      run(insertSql, [workId, split.userId, split.percentage]);
      
      const user = AuthService.getById(split.userId);
      if (user) {
        NotificationService.create(
          split.userId,
          'settlement',
          '版税分成已设置',
          `作品「${work.title}」的版税分成已设置，您的分成比例为 ${split.percentage}%`,
          `royalty:${workId}`
        );
      }
    });
    
    return { success: true, message: '版税分成设置成功' };
  }

  static getSplits(workId: number): RoyaltySplit[] {
    const rows = all(`
      SELECT * FROM royalty_splits WHERE work_id = ?
    `, [workId]) as any[];
    
    return rows.map(row => {
      const split = this.mapSplitRow(row);
      split.user = AuthService.getById(row.user_id) || undefined;
      return split;
    });
  }

  static calculateRevenue(workId: number, totalRevenue: number): { userId: number; name: string; amount: number; percentage: number }[] {
    const splits = this.getSplits(workId);
    
    return splits.map(split => ({
      userId: split.userId,
      name: split.user?.name || '未知用户',
      percentage: split.percentage,
      amount: (totalRevenue * split.percentage) / 100
    }));
  }

  static generateReport(workId: number, month: string): RoyaltyReport | null {
    const work = WorkService.getById(workId);
    if (!work) return null;
    
    const totalRevenue = Math.random() * 50000 + 5000;
    
    const reportsDir = path.join(__dirname, '..', '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const reportPath = path.join(reportsDir, `royalty-${workId}-${month}.pdf`);
    this.generatePDF(work, totalRevenue, month, reportPath);
    
    const insertSql = `
      INSERT INTO royalty_reports (work_id, report_path, total_revenue, month)
      VALUES (?, ?, ?, ?)
    `;
    
    const result = run(insertSql, [workId, `/reports/royalty-${workId}-${month}.pdf`, totalRevenue, month]);
    const reportId = result.lastInsertRowid as number;
    
    const splits = this.getSplits(workId);
    splits.forEach(split => {
      const amount = (totalRevenue * split.percentage) / 100;
      NotificationService.create(
        split.userId,
        'settlement',
        '月度结算报告已生成',
        `作品「${work.title}」${month}月结算报告已生成，您的收益为 ¥${amount.toFixed(2)}`,
        `report:${reportId}`
      );
    });
    
    const admins = AuthService.getAll('admin');
    admins.forEach(admin => {
      NotificationService.create(
        admin.id,
        'settlement',
        '月度结算报告已生成',
        `作品「${work.title}」${month}月结算报告已生成，总收益 ¥${totalRevenue.toFixed(2)}`,
        `report:${reportId}`
      );
    });
    
    return this.getReportById(reportId);
  }

  static generateMonthlyReports(): RoyaltyReport[] {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const works = all('SELECT DISTINCT work_id FROM royalty_splits', []) as { work_id: number }[];
    
    const reports: RoyaltyReport[] = [];
    works.forEach(row => {
      const report = this.generateReport(row.work_id, month);
      if (report) reports.push(report);
    });
    
    return reports;
  }

  static getReportById(id: number): RoyaltyReport | null {
    const row = get('SELECT * FROM royalty_reports WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const report = this.mapReportRow(row);
    report.work = WorkService.getById(row.work_id) || undefined;
    
    return report;
  }

  static getReports(workId?: number, month?: string): RoyaltyReport[] {
    let query = 'SELECT * FROM royalty_reports';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (workId) {
      conditions.push('work_id = ?');
      params.push(workId);
    }
    
    if (month) {
      conditions.push('month = ?');
      params.push(month);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY generated_at DESC';
    
    const rows = all(query, params) as any[];
    
    return rows.map(row => {
      const report = this.mapReportRow(row);
      report.work = WorkService.getById(row.work_id) || undefined;
      return report;
    });
  }

  private static generatePDF(work: any, totalRevenue: number, month: string, filePath: string) {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    doc.fontSize(24).fillColor('#6C5CE7').text('版税结算报告', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(14).fillColor('#333').text(`报告月份：${month}`);
    doc.text(`作品名称：${work.title}`);
    doc.moveDown();
    
    doc.fontSize(18).fillColor('#00CEC9').text('收益明细');
    doc.moveDown();
    
    const splits = this.getSplits(work.id);
    
    doc.fontSize(12).fillColor('#666').text('总收益：');
    doc.fontSize(20).fillColor('#00B894').text(`¥${totalRevenue.toFixed(2)}`);
    doc.moveDown();
    
    doc.fontSize(14).fillColor('#333').text('分成明细：');
    doc.moveDown();
    
    splits.forEach((split, index) => {
      const amount = (totalRevenue * split.percentage) / 100;
      doc.fontSize(12).fillColor('#333').text(
        `${index + 1}. ${split.user?.name || '未知'} - ${split.percentage}% - ¥${amount.toFixed(2)}`
      );
    });
    
    doc.moveDown(2);
    doc.fontSize(10).fillColor('#999').text('生成时间：' + new Date().toLocaleString());
    doc.text('音乐制作协作平台 版权所有');
    
    doc.end();
  }

  private static mapSplitRow(row: any): RoyaltySplit {
    return {
      id: row.id,
      workId: row.work_id,
      userId: row.user_id,
      percentage: row.percentage,
      createdAt: row.created_at
    };
  }

  private static mapReportRow(row: any): RoyaltyReport {
    return {
      id: row.id,
      workId: row.work_id,
      reportPath: row.report_path,
      totalRevenue: row.total_revenue,
      month: row.month,
      generatedAt: row.generated_at
    };
  }
}
