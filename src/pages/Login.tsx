import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Lock, Mail, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@i2b-edu.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome back, Administrator!');
      navigate('/');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email.');
      return;
    }
    setResetLoading(true);
    const { error } = await resetPassword(resetEmail);
    setResetLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Password reset link sent! Check your inbox.');
      setResetModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Logo & Name */}
        <div className="inline-flex p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl mb-4">
          <img
            src={settings.logo_url || '/logo.jpg'}
            alt="I2B Logo"
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover ring-2 ring-emerald-500/40"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {settings.institution_name}
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-emerald-400 font-medium">
          {settings.subtitle} • Administrator Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-5 sm:px-10 shadow-2xl rounded-2xl border border-slate-200">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Admin Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@i2b-edu.com"
              required
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 underline"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              variant="primary"
              size="lg"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick Admin Helper Card */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Default Admin Credentials</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Pre-configured administrator access for setup and offline testing:
              </p>
              <div className="mt-2 bg-white rounded-lg p-2 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                <div>Email: <span className="font-semibold text-slate-900">admin@i2b-edu.com</span></div>
                <div>Pass: <span className="font-semibold text-slate-900">Admin@123</span></div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          I2B Student & Fee Management System • Confidential Institutional Application
        </p>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Administrator Password"
        subtitle="We will send a secure password reset link to your email"
        maxWidth="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4 py-2">
          <Input
            label="Administrator Email"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="admin@i2b-edu.com"
            required
            leftIcon={<Mail className="w-4 h-4" />}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={resetLoading}
              icon={<KeyRound className="w-4 h-4" />}
            >
              Send Reset Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

