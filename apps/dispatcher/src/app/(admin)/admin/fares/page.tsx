export default function AdminFaresPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--neutral-50)] p-12">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--neutral-900)]">Tarifas</h1>
      <span className="inline-flex items-center gap-2 text-sm text-[var(--neutral-500)] mt-3">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-accent)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--brand-accent)]" />
        </span>
        En construcción
      </span>
    </div>
  );
}
