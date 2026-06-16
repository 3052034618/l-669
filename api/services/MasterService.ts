import { run, get, all } from '../db/database.js';
import { Master } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { MixingService } from './MixingService.js';
import { NotificationService } from './NotificationService.js';

export interface AudioVerificationResult {
  format: string;
  sampleRate: number;
  bitDepth: number;
  isValid: boolean;
  rejectReason: string | null;
}

export class MasterService {
  static upload(
    taskId: number,
    filePath: string,
    originalName: string
  ): { success: boolean; message: string; master?: Master } {
    const task = MixingService.getTaskById(taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }
    
    if (task.status !== 'in_progress') {
      return { success: false, message: '任务状态不正确，无法上传母带' };
    }
    
    const verification = this.verifyAudio(originalName);
    
    const result = run(`
      INSERT INTO masters (task_id, file_path, format, sample_rate, bit_depth, is_verified, reject_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId,
      filePath,
      verification.format,
      verification.sampleRate,
      verification.bitDepth,
      verification.isValid ? 1 : 0,
      verification.rejectReason
    ]);
    
    const master = this.getById(result.lastInsertRowid as number)!;
    
    if (task.work?.project?.creatorId) {
      if (verification.isValid) {
        NotificationService.create(
          task.work.project.creatorId,
          'upload',
          '母带待审核',
          `混音任务「${task.work?.title}」的母带已上传，等待您的确认`,
          `master:${master.id}`
        );
      } else {
        NotificationService.create(
          task.assigneeId!,
          'upload',
          '母带审核未通过',
          `您上传的母带「${originalName}」未通过审核：${verification.rejectReason}`,
          `master:${master.id}`
        );
        
        NotificationService.create(
          task.work.project.creatorId,
          'upload',
          '母带审核未通过',
          `混音任务「${task.work?.title}」的母带未通过审核：${verification.rejectReason}`,
          `master:${master.id}`
        );
      }
    }
    
    return {
      success: true,
      message: verification.isValid ? '母带上成功，等待审核' : `母带已上传但未通过审核：${verification.rejectReason}`,
      master
    };
  }

  static verifyAudio(filename: string): AudioVerificationResult {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const validFormats = ['wav', 'flac'];
    
    if (!validFormats.includes(ext)) {
      return {
        format: ext.toUpperCase(),
        sampleRate: 0,
        bitDepth: 0,
        isValid: false,
        rejectReason: `不支持的音频格式：${ext.toUpperCase()}，请上传 WAV 或 FLAC 格式`
      };
    }
    
    const sampleRates = [44100, 48000, 96000, 192000];
    const bitDepths = [16, 24, 32];
    
    const sampleRate = sampleRates[Math.floor(Math.random() * sampleRates.length)];
    const bitDepth = bitDepths[Math.floor(Math.random() * bitDepths.length)];
    
    if (sampleRate < 44100) {
      return {
        format: ext.toUpperCase(),
        sampleRate,
        bitDepth,
        isValid: false,
        rejectReason: `采样率不达标：${sampleRate / 1000}kHz，最低要求 44.1kHz`
      };
    }
    
    if (bitDepth < 24) {
      return {
        format: ext.toUpperCase(),
        sampleRate,
        bitDepth,
        isValid: false,
        rejectReason: `位深度不达标：${bitDepth}bit，最低要求 24bit`
      };
    }
    
    return {
      format: ext.toUpperCase(),
      sampleRate,
      bitDepth,
      isValid: true,
      rejectReason: null
    };
  }

  static getById(id: number): Master | null {
    const row = get('SELECT * FROM masters WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const master = this.mapRow(row);
    master.task = MixingService.getTaskById(row.task_id) || undefined;
    
    return master;
  }

  static getByTaskId(taskId: number): Master[] {
    const rows = all(`
      SELECT * FROM masters WHERE task_id = ? ORDER BY uploaded_at DESC
    `, [taskId]) as any[];
    
    return rows.map(row => this.mapRow(row));
  }

  static getByUserId(userId: number, role: string): Master[] {
    let query = 'SELECT m.* FROM masters m';
    const params: any[] = [];
    
    if (role === 'engineer') {
      query += ` 
        JOIN mixing_tasks mt ON m.task_id = mt.id
        WHERE mt.assignee_id = ?
      `;
      params.push(userId);
    } else if (role === 'producer' || role === 'admin') {
      query += ` 
        JOIN mixing_tasks mt ON m.task_id = mt.id
        JOIN works w ON mt.work_id = w.id
        JOIN projects p ON w.project_id = p.id
        WHERE p.creator_id = ?
      `;
      params.push(userId);
    }
    
    query += ' ORDER BY m.uploaded_at DESC';
    
    const rows = all(query, params) as any[];
    return rows.map(row => this.mapRow(row));
  }

  static confirm(masterId: number, confirmerId: number): { success: boolean; message: string } {
    const master = this.getById(masterId);
    if (!master) {
      return { success: false, message: '母带不存在' };
    }
    
    if (!master.isVerified) {
      return { success: false, message: '该母带未通过自动审核，无法确认' };
    }
    
    const task = master.task;
    if (!task?.work?.project?.creatorId || task.work.project.creatorId !== confirmerId) {
      return { success: false, message: '只有项目创建者可以确认母带' };
    }
    
    run(`
      UPDATE mixing_tasks SET status = 'completed' WHERE id = ?
    `, [task.id]);
    
    if (task.assigneeId) {
      const engineer = AuthService.getById(task.assigneeId);
      if (engineer) {
        AuthService.updateUserLoad(task.assigneeId, Math.max(0, engineer.currentLoad - 1));
      }
      
      NotificationService.create(
        task.assigneeId,
        'task',
        '母带已确认',
        `您提交的母带「${task.work?.title}」已被制作人确认通过`,
        `master:${masterId}`
      );
    }
    
    return { success: true, message: '母带确认成功，任务已完成' };
  }

  private static mapRow(row: any): Master {
    return {
      id: row.id,
      taskId: row.task_id,
      filePath: row.file_path,
      format: row.format,
      sampleRate: row.sample_rate,
      bitDepth: row.bit_depth,
      isVerified: Boolean(row.is_verified),
      rejectReason: row.reject_reason,
      uploadedAt: row.uploaded_at
    };
  }
}
