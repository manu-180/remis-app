'use client';

import { useState } from 'react';
import { Car, Users, AlertTriangle, Package } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerTrigger } from '@/components/ui/drawer';
import { toast } from '@/components/ui/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ShowcaseClient() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'dense'>('comfortable');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switchVal, setSwitchVal] = useState(false);
  const [selectVal, setSelectVal] = useState('');
  const [comboVal, setComboVal] = useState('');
  const [page, setPage] = useState(1);
  const [skeletonLoading] = useState(true);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  const toggleDensity = () => {
    const options = ['comfortable', 'compact', 'dense'] as const;
    const next = options[(options.indexOf(density) + 1) % options.length] as typeof density;
    setDensity(next);
    document.documentElement.dataset.density = next;
  };

  const selectOptions = [
    { value: 'ba', label: 'Buenos Aires' },
    { value: 'cba', label: 'Córdoba' },
    { value: 'ro', label: 'Rosario' },
    { value: 'mza', label: 'Mendoza' },
  ];

  return (
    <div className="min-h-screen bg-[var(--neutral-50)] p-8 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--neutral-900)]">
            Design System — Showcase interno
          </h1>
          <p className="text-sm text-[var(--neutral-500)] mt-1">
            Solo visible en desarrollo. Verificación visual de primitivos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={toggleTheme}>
            Tema: {theme}
          </Button>
          <Button variant="secondary" onClick={toggleDensity}>
            Density: {density}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Breadcrumbs</h2>
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Conductores', href: '/admin/drivers' },
            { label: 'Juan Pérez' },
          ]}
        />
      </section>

      {/* Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default</CardTitle>
              <CardDescription>Card estándar</CardDescription>
            </CardHeader>
            <CardContent>Contenido de la card.</CardContent>
          </Card>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Elevated</CardTitle>
              <CardDescription>Con shadow-md</CardDescription>
            </CardHeader>
            <CardContent>Más prominencia visual.</CardContent>
          </Card>
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Glass</CardTitle>
              <CardDescription>Superficie translúcida</CardDescription>
            </CardHeader>
            <CardContent>Efecto blur premium.</CardContent>
          </Card>
          <Card variant="accent">
            <CardHeader>
              <CardTitle>Accent</CardTitle>
              <CardDescription>Border dorado izquierdo</CardDescription>
            </CardHeader>
            <CardContent>Destacar información.</CardContent>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Stats</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <Stat label="Viajes hoy" value={142} delta={12} icon={<Car size={18} />} />
          </Card>
          <Card>
            <Stat label="Conductores activos" value={38} delta={-3} icon={<Users size={18} />} />
          </Card>
          <Card>
            <Stat label="SOS activos" value={2} icon={<AlertTriangle size={18} />} />
          </Card>
          <Card>
            <Stat label="Ingresos" value={89450} prefix="$" delta={8} />
          </Card>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <Stat label="Cargando..." value={0} loading={skeletonLoading} />
          </Card>
        </div>
      </section>

      {/* Skeletons */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Skeleton</h2>
        <div className="space-y-2 max-w-sm">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </section>

      {/* Status Pills */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Status Pills</h2>
        <div className="flex flex-wrap gap-3">
          <StatusPill variant="online"  label="Disponible" pulse />
          <StatusPill variant="busy"    label="En viaje" />
          <StatusPill variant="offline" label="Sin conexión" />
          <StatusPill variant="danger"  label="Suspendido" pulse />
          <StatusPill variant="pending" label="Solicitado" />
        </div>
      </section>

      {/* Form primitives */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Formulario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Field label="Nombre" htmlFor="name" required>
            <Input id="name" placeholder="Juan Pérez" />
          </Field>
          <Field label="Ciudad" htmlFor="city">
            <Select
              id="city"
              options={selectOptions}
              value={selectVal}
              onValueChange={setSelectVal}
              placeholder="Seleccioná una ciudad"
            />
          </Field>
          <Field label="Conductor" htmlFor="driver" description="Buscá por nombre o patente">
            <Combobox
              options={[
                { value: '1', label: 'Carlos Rodríguez — ABC123' },
                { value: '2', label: 'Miguel Torres — XYZ789' },
                { value: '3', label: 'Roberto Díaz — DEF456' },
              ]}
              value={comboVal}
              onValueChange={setComboVal}
            />
          </Field>
          <Field label="Notas" htmlFor="notes" error="Este campo es requerido">
            <Textarea id="notes" placeholder="Escribí acá..." />
          </Field>
          <div className="flex items-center gap-3">
            <Switch
              id="notifications"
              checked={switchVal}
              onCheckedChange={setSwitchVal}
              aria-label="Activar notificaciones"
            />
            <Label htmlFor="notifications">Notificaciones activas</Label>
          </div>
        </div>
      </section>

      {/* Toasts */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Toasts</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast.success('Cambios guardados correctamente', { undo: () => console.log('undo') })}>
            Success con Deshacer
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Error al guardar los cambios')}>
            Error
          </Button>
          <Button variant="secondary" onClick={() => toast.info('Nueva actualización disponible')}>
            Info
          </Button>
          <Button variant="secondary" onClick={() => toast.loading('Procesando...')}>
            Loading
          </Button>
        </div>
      </section>

      {/* Drawer */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Drawer</h2>
        <Button variant="primary" onClick={() => setDrawerOpen(true)}>
          Abrir Drawer
        </Button>
        <Drawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="Drawer de prueba"
          footer={
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => { toast.success('Guardado'); setDrawerOpen(false); }}>Guardar</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Nombre completo" htmlFor="drawer-name" required>
              <Input id="drawer-name" placeholder="Nombre y apellido" />
            </Field>
            <Field label="Ciudad" htmlFor="drawer-city">
              <Select options={selectOptions} value={selectVal} onValueChange={setSelectVal} />
            </Field>
            <Field label="Notas" htmlFor="drawer-notes">
              <Textarea id="drawer-notes" placeholder="Información adicional..." />
            </Field>
            <div className="flex items-center gap-3">
              <Switch checked={switchVal} onCheckedChange={setSwitchVal} aria-label="Activo" />
              <Label>Cuenta activa</Label>
            </div>
          </div>
        </Drawer>
      </section>

      {/* Empty State */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Empty State</h2>
        <Card>
          <EmptyState
            icon={<Package size={32} />}
            title="No hay resultados"
            description="No encontramos ningún registro que coincida con tu búsqueda. Intentá con otros filtros."
            action={{ label: 'Limpiar filtros', onClick: () => {} }}
          />
        </Card>
      </section>

      {/* Pagination */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">Pagination</h2>
        <Pagination page={page} totalPages={12} onPageChange={setPage} />
        <p className="text-sm text-[var(--neutral-500)]">Página actual: {page}</p>
      </section>
    </div>
  );
}
