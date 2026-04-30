export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--neutral-50)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl sm:text-6xl font-bold text-[var(--neutral-300)]">Link no disponible</p>
        <p className="mt-4 text-base text-[var(--neutral-700)]">
          El link del viaje compartido expiro o fue revocado.
        </p>
        <p className="mt-1 text-sm text-[var(--neutral-500)]">
          Pedile a quien te lo envio que te comparta uno nuevo.
        </p>
      </div>
    </div>
  );
}
