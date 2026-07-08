import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiMail, FiLock, FiLogIn, FiShield } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Selamat datang, ${user.name}!`);
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.message || 'Login gagal, coba lagi.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{
      backgroundImage: 'url("/bg-sekolah.jpeg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* Overlay gradasi gelap */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      {/* Pola dekoratif overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 bg-white shadow-lg shadow-blue-500/10 rounded-2xl flex items-center justify-center">
                <img src="/letter.png" alt="Logo" className="w-12 h-12 object-contain" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">SchoolMailer</h1>
            <p className="text-slate-500 mt-1 text-sm">Sistem Otomatisasi Surat Sekolah</p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <FiShield className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-700 font-medium text-xs tracking-wide uppercase">SMAN 19 Medan</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiMail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@schoolmailer.com"
                  autoComplete="email"
                  {...register('email')}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><span>•</span>{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiLock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="block w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 placeholder-slate-400 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><span>•</span>{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={FiLogIn}
              className="w-full"
            >
              Masuk
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-slate-400 text-xs">
              &copy; 2026 SMAN 19 Medan — SchoolMailer v1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
