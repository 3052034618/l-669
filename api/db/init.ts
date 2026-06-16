import { run, get, all, exec } from './database.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function initDatabase() {
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('producer', 'engineer', 'songwriter', 'admin')),
      avatar VARCHAR(255),
      rating DECIMAL(3,2) DEFAULT 0,
      current_load INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role VARCHAR(50) NOT NULL,
      permissions TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      version INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      uploader_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      lyrics TEXT,
      melody_path VARCHAR(500),
      melody_hash VARCHAR(64),
      similarity_score DECIMAL(5,2) DEFAULT 0,
      is_locked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (uploader_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mixing_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      assignee_id INTEGER,
      status VARCHAR(20) DEFAULT 'pending',
      budget DECIMAL(10,2) NOT NULL,
      deadline DATETIME,
      min_rating_required DECIMAL(3,2) DEFAULT 4.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES works(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agreements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      producer_signed BOOLEAN DEFAULT 0,
      engineer_signed BOOLEAN DEFAULT 0,
      signed_at DATETIME,
      FOREIGN KEY (task_id) REFERENCES mixing_tasks(id)
    );

    CREATE TABLE IF NOT EXISTS masters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      format VARCHAR(10) NOT NULL,
      sample_rate INTEGER NOT NULL,
      bit_depth INTEGER NOT NULL,
      is_verified BOOLEAN DEFAULT 0,
      reject_reason TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      confirmer_id INTEGER,
      confirmed_at DATETIME,
      confirm_note TEXT,
      FOREIGN KEY (task_id) REFERENCES mixing_tasks(id)
    );

    CREATE TABLE IF NOT EXISTS royalty_splits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      percentage DECIMAL(5,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES works(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS royalty_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id INTEGER NOT NULL,
      report_path VARCHAR(500) NOT NULL,
      total_revenue DECIMAL(12,2) NOT NULL,
      month VARCHAR(7) NOT NULL,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (work_id) REFERENCES works(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      related_id VARCHAR(100),
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(200) NOT NULL,
      category VARCHAR(100) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      material_type VARCHAR(10) DEFAULT 'file',
      access_permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userCount = get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  
  if (!userCount || userCount.count === 0) {
    const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
    
    run(
      'INSERT INTO users (email, password_hash, name, role, avatar, rating) VALUES (?, ?, ?, ?, ?, ?)',
      ['admin@music.com', hashPassword('admin123'), '系统管理员', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 5.0]
    );
    run(
      'INSERT INTO users (email, password_hash, name, role, avatar, rating) VALUES (?, ?, ?, ?, ?, ?)',
      ['producer@music.com', hashPassword('producer123'), '张制作人', 'producer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=producer', 4.8]
    );
    run(
      'INSERT INTO users (email, password_hash, name, role, avatar, rating) VALUES (?, ?, ?, ?, ?, ?)',
      ['engineer@music.com', hashPassword('engineer123'), '李混音师', 'engineer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=engineer', 4.5]
    );
    run(
      'INSERT INTO users (email, password_hash, name, role, avatar, rating) VALUES (?, ?, ?, ?, ?, ?)',
      ['songwriter@music.com', hashPassword('songwriter123'), '王词曲', 'songwriter', 'https://api.dicebear.com/7.x/avataaars/svg?seed=songwriter', 4.2]
    );

    console.log('初始用户数据已插入');
    console.log('测试账号:');
    console.log('管理员: admin@music.com / admin123');
    console.log('制作人: producer@music.com / producer123');
    console.log('混音师: engineer@music.com / engineer123');
    console.log('词曲作者: songwriter@music.com / songwriter123');
  }

  try {
    exec('ALTER TABLE works ADD COLUMN melody_hash VARCHAR(64)');
  } catch (e) {}
  try {
    exec('ALTER TABLE materials ADD COLUMN material_type VARCHAR(10) DEFAULT \'file\'');
  } catch (e) {}
  try {
    exec('ALTER TABLE masters ADD COLUMN confirmer_id INTEGER');
  } catch (e) {}
  try {
    exec('ALTER TABLE masters ADD COLUMN confirmed_at DATETIME');
  } catch (e) {}
  try {
    exec('ALTER TABLE masters ADD COLUMN confirm_note TEXT');
  } catch (e) {}

  console.log('数据库初始化完成');
}
