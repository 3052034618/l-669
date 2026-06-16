import { run, get, all } from '../db/database.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, LoginRequest, RegisterRequest, AuthResponse, UserRole } from '../../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'music-platform-secret-key';
const JWT_EXPIRES_IN = '7d';

export class AuthService {
  static async login(data: LoginRequest): Promise<AuthResponse | null> {
    const user = get('SELECT * FROM users WHERE email = ?', [data.email]) as any;
    
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(data.password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }

    const userData = this.mapRow(user);
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return { token, user: userData };
  }

  static async register(data: RegisterRequest): Promise<AuthResponse | null> {
    const existingUser = get('SELECT id FROM users WHERE email = ?', [data.email]);
    
    if (existingUser) {
      return null;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    
    const result = run(`
      INSERT INTO users (email, password_hash, name, role, avatar, rating)
      VALUES (?, ?, ?, ?, ?, 0)
    `, [
      data.email,
      passwordHash,
      data.name,
      data.role,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`
    ]);

    const user = this.getById(result.lastInsertRowid);
    
    if (!user) {
      return null;
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return { token, user };
  }

  static getById(id: number): User | null {
    const row = get('SELECT * FROM users WHERE id = ?', [id]) as any;
    return row ? this.mapRow(row) : null;
  }

  static getByEmail(email: string): User | null {
    const row = get('SELECT * FROM users WHERE email = ?', [email]) as any;
    return row ? this.mapRow(row) : null;
  }

  static getAll(role?: UserRole): User[] {
    let query = 'SELECT * FROM users';
    const params: any[] = [];
    
    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rows = all(query, params) as any[];
    return rows.map(row => this.mapRow(row));
  }

  static updateUserLoad(userId: number, load: number): boolean {
    const result = run('UPDATE users SET current_load = ? WHERE id = ?', [load, userId]);
    return result.changes > 0;
  }

  static mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      avatar: row.avatar,
      rating: row.rating,
      currentLoad: row.current_load,
      createdAt: row.created_at
    };
  }
}
