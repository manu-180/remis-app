export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--neutral-50)] flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-[var(--neutral-300)]">404</p>
        <p className="mt-2 text-lg text-[var(--neutral-600)]">Este enlace no existe o ya expiró.</p>
        <p className="mt-1 text-sm text-[var(--neutral-400)]">El viaje compartido no está disponible.</p>
      </div>
    </div>
  );
}
