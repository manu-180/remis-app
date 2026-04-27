'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

export function LockScreen() {
  const isLocked = useUIStore((s) => s.isLocked);
  const unlock = useUIStore((s) => s.unlock);
  const [time, setTime] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!isLocked) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) unlock();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6 text-white">
        <time className="text-7xl font-bold font-mono tabular-nums">{time}</time>
        <p className="text-lg text-white/70">Despacho bloqueado</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-64">
          <input
            type="password"
            placeholder="Contraseña para desbloquear"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="rounded-lg bg-white/10 border border-white/20 px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--brand-primary)]"
          />
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand-primary)] px-4 py-2 font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Desbloquear
          </button>
        </form>
      </div>
    </div>
  );
}
