import { run, get, all } from '../db/database.js';
import { Work } from '../../shared/types.js';
import { AuthService } from './AuthService.js';
import { ProjectService } from './ProjectService.js';
import { NotificationService } from './NotificationService.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class WorkService {
  static create(
    projectId: number,
    uploaderId: number,
    title: string,
    lyrics: string,
    melodyPath: string
  ): Work | null {
    const project = ProjectService.getById(projectId);
    if (!project) return null;
    
    const melodyHash = melodyPath ? this.computeFileHash(melodyPath) : '';
    
    const result = run(`
      INSERT INTO works (project_id, uploader_id, title, lyrics, melody_path, melody_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectId, uploaderId, title, lyrics, melodyPath, melodyHash]);
    const workId = result.lastInsertRowid as number;
    
    const similarityScore = this.checkSimilarity(workId, title, lyrics, melodyHash);
    const isLocked = similarityScore > 70;
    
    if (isLocked) {
      run(`
        UPDATE works SET similarity_score = ?, is_locked = 1 WHERE id = ?
      `, [similarityScore, workId]);
      
      const uploader = AuthService.getById(uploaderId);
      if (uploader) {
        NotificationService.create(
          uploaderId,
          'upload',
          '作品上传异常',
          `您上传的作品「${title}」旋律相似度达${similarityScore}%，已被锁定`,
          `work:${workId}`
        );
        
        const admins = AuthService.getAll('admin');
        admins.forEach(admin => {
          NotificationService.create(
            admin.id,
            'upload',
            '疑似重复作品',
            `作品「${title}」旋律相似度达${similarityScore}%，已被锁定`,
            `work:${workId}`
          );
        });
      }
    } else {
      run(`
        UPDATE works SET similarity_score = ? WHERE id = ?
      `, [similarityScore, workId]);
      
      const uploader = AuthService.getById(uploaderId);
      if (uploader) {
        NotificationService.create(
          uploaderId,
          'upload',
          '作品上传成功',
          `您的作品「${title}」已成功上传`,
          `work:${workId}`
        );
      }
      
      const members = ProjectService.getMembers(projectId);
      members.forEach(member => {
        if (member.userId !== uploaderId) {
          NotificationService.create(
            member.userId,
            'upload',
            '新作品上传',
            `项目「${project.name}」有新作品「${title}」已上传`,
            `work:${workId}`
          );
        }
      });
    }
    
    return this.getById(workId);
  }

  private static computeFileHash(filePath: string): string {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return '';
      }
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash('sha256');
      hashSum.update(fileBuffer);
      return hashSum.digest('hex');
    } catch (error) {
      return '';
    }
  }

  static getById(id: number): Work | null {
    const row = get('SELECT * FROM works WHERE id = ?', [id]) as any;
    if (!row) return null;
    
    const work = this.mapRow(row);
    work.uploader = AuthService.getById(row.uploader_id) || undefined;
    work.project = ProjectService.getById(row.project_id) || undefined;
    
    return work;
  }

  static getByProjectId(projectId: number): Work[] {
    const rows = all(`
      SELECT * FROM works WHERE project_id = ? ORDER BY created_at DESC
    `, [projectId]) as any[];
    
    return rows.map(row => {
      const work = this.mapRow(row);
      work.uploader = AuthService.getById(row.uploader_id) || undefined;
      return work;
    });
  }

  static getByUserId(userId: number): Work[] {
    const rows = all(`
      SELECT * FROM works WHERE uploader_id = ? ORDER BY created_at DESC
    `, [userId]) as any[];
    
    return rows.map(row => {
      const work = this.mapRow(row);
      work.project = ProjectService.getById(row.project_id) || undefined;
      return work;
    });
  }

  static checkSimilarity(currentWorkId: number, title: string, lyrics: string, melodyHash: string): number {
    const allWorks = all('SELECT id, title, lyrics, melody_hash FROM works WHERE id != ?', [currentWorkId]) as any[];
    
    if (allWorks.length === 0) {
      return Math.floor(this.stableHash(title + lyrics) % 30);
    }
    
    let maxSimilarity = 0;
    
    for (const existingWork of allWorks) {
      let similarity = 0;
      
      if (melodyHash && existingWork.melody_hash && melodyHash === existingWork.melody_hash) {
        similarity = 95;
      } else {
        const titleSim = this.stringSimilarity(title, existingWork.title);
        const lyricsSim = this.stringSimilarity(lyrics || '', existingWork.lyrics || '');
        similarity = Math.round(titleSim * 0.4 + lyricsSim * 0.6);
      }
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }
    }
    
    return Math.min(99, maxSimilarity);
  }

  static checkSimilarityById(workId: number): number {
    const work = this.getById(workId);
    if (!work) return 0;
    
    const row = get('SELECT melody_hash FROM works WHERE id = ?', [workId]) as any;
    const melodyHash = row?.melody_hash || '';
    
    return this.checkSimilarity(workId, work.title, work.lyrics || '', melodyHash);
  }

  private static stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 100;
    
    const s1 = str1.toLowerCase().replace(/\s+/g, '');
    const s2 = str2.toLowerCase().replace(/\s+/g, '');
    
    if (s1.length < 2 || s2.length < 2) return 0;
    
    let matches = 0;
    const len1 = s1.length;
    const len2 = s2.length;
    
    for (let i = 0; i <= len1 - 2; i++) {
      const sub1 = s1.substring(i, i + 2);
      for (let j = 0; j <= len2 - 2; j++) {
        if (sub1 === s2.substring(j, j + 2)) {
          matches++;
          break;
        }
      }
    }
    
    const maxPossible = Math.min(len1, len2) - 1;
    if (maxPossible <= 0) return 0;
    
    return Math.round((matches / maxPossible) * 100);
  }

  private static stableHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private static mapRow(row: any): Work {
    return {
      id: row.id,
      projectId: row.project_id,
      uploaderId: row.uploader_id,
      title: row.title,
      lyrics: row.lyrics,
      melodyPath: row.melody_path,
      similarityScore: row.similarity_score,
      isLocked: Boolean(row.is_locked),
      createdAt: row.created_at
    };
  }
}
