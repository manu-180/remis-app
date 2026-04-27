function getVolume(): number {
  try {
    const { useUIStore } = require('@/stores/ui-store');
    return useUIStore.getState().soundVolume ?? 0.6;
  } catch {
    return 0.6;
  }
}

function makeContext(): AudioContext | null {
  try {
    return new (window.AudioContext ?? (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

export function playNewRideSound(): void {
  const ctx = makeContext();
  if (!ctx) return;
  const vol = getVolume();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => ctx.close();
  } catch {
    ctx.close();
  }
}

export function playScheduledRideSound(): void {
  const ctx = makeContext();
  if (!ctx) return;
  const vol = getVolume();
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc.onended = () => ctx.close();
  } catch {
    ctx.close();
  }
}

export function playDriverOfflineSound(): void {
  const ctx = makeContext();
  if (!ctx) return;
  const vol = getVolume();
  try {
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'square';
      const t = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(vol * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.start(t);
      osc.stop(t + 0.1);
    }
    setTimeout(() => ctx.close(), 500);
  } catch {
    ctx.close();
  }
}

export function playSosSound(): () => void {
  const ctx = makeContext();
  if (!ctx) return () => {};
  const vol = getVolume();
  let stopped = false;

  function playBeep(freq: number, startTime: number) {
    if (stopped) return;
    try {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.frequency.value = freq;
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(vol * 0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    } catch {}
  }

  let t = ctx.currentTime;
  const loop = () => {
    if (stopped) return;
    playBeep(880, t);
    playBeep(660, t + 0.35);
    t += 0.8;
    setTimeout(loop, 800);
  };
  loop();

  return () => {
    stopped = true;
    try {
      ctx.close();
    } catch {}
  };
}

export function registerAudioGesture(): void {
  try {
    const ctx = new (window.AudioContext ?? (window as any).webkitAudioContext)();
    ctx.resume().then(() => ctx.close()).catch(() => {});
  } catch {}
}
