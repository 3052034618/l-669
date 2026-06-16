import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { Button } from '../components/Card.js';

const roleLabels: Record<string, string> = {
  producer: '音乐制作人',
  engineer: '混音师',
  songwriter: '词曲作者',
  admin: '平台管理员'
};

const roleIcons: Record<string, string> = {
  producer: '🎵',
  engineer: '🎧',
  songwriter: '✍️',
  admin: '⚙️'
};

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'producer' | 'engineer' | 'songwriter'>('producer');
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    try {
      if (isRegister) {
        // 注册逻辑将在后续实现，这里先演示登录
        await login({ email, password });
      } else {
        await login({ email, password });
      }
      navigate('/dashboard');
    } catch (err) {
      // 错误已在 store 中处理
    }
  };

  const quickLogin = (email: string, pwd: string) => {
    setEmail(email);
    setPassword(pwd);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-900/30 via-transparent to-cyan-900/30 pointer-events-none" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239333ea%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="relative w-full max-w-md"
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />

        <div className="relative bg-slate-800/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-violet-500/30"
              >
                <Music className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white mb-2">HarmonyHub</h1>
              <p className="text-slate-400">大型在线音乐制作协作平台</p>
            </div>

            <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-xl">
              <button
                onClick={() => setIsRegister(false)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  !isRegister
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                登录
              </button>
              <button
                onClick={() => setIsRegister(true)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                  isRegister
                    ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                注册
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={isRegister ? 'register' : 'login'}
                initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {isRegister && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">用户名</label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                          placeholder="输入您的用户名"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-slate-300 mb-2">角色</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['producer', 'engineer', 'songwriter'] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`p-3 rounded-xl border transition-all ${
                              role === r
                                ? 'border-violet-500 bg-violet-500/20 text-white'
                                : 'border-slate-700/50 bg-slate-900/30 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="text-xl block mb-1">{roleIcons[r]}</span>
                            <span className="text-xs">{roleLabels[r]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm text-slate-300 mb-2">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                      placeholder="输入您的邮箱"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-2">密码</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
                      placeholder="输入您的密码"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button type="submit" loading={isLoading} className="w-full py-3" size="lg">
                  {isRegister ? '创建账户' : '登录'}
                </Button>

                {!isRegister && (
                  <div className="pt-4">
                    <p className="text-xs text-slate-500 text-center mb-3">快速登录测试账号</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => quickLogin('producer@music.com', 'producer123')}
                        className="py-2 px-3 text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 hover:border-violet-500/50 hover:text-white transition-all"
                      >
                        🎵 制作人
                      </button>
                      <button
                        type="button"
                        onClick={() => quickLogin('engineer@music.com', 'engineer123')}
                        className="py-2 px-3 text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 hover:border-violet-500/50 hover:text-white transition-all"
                      >
                        🎧 混音师
                      </button>
                      <button
                        type="button"
                        onClick={() => quickLogin('songwriter@music.com', 'songwriter123')}
                        className="py-2 px-3 text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 hover:border-violet-500/50 hover:text-white transition-all"
                      >
                        ✍️ 词曲作者
                      </button>
                      <button
                        type="button"
                        onClick={() => quickLogin('admin@music.com', 'admin123')}
                        className="py-2 px-3 text-xs bg-slate-900/50 border border-slate-700/50 rounded-lg text-slate-300 hover:border-violet-500/50 hover:text-white transition-all"
                      >
                        ⚙️ 管理员
                      </button>
                    </div>
                  </div>
                )}
              </motion.form>
            </AnimatePresence>
          </div>

          <div className="px-8 py-4 border-t border-slate-700/30 bg-slate-900/30">
            <p className="text-xs text-center text-slate-500">
              © 2024 HarmonyHub. 让音乐创作更简单，让协作更高效。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
