'use client';

import { useState, useMemo } from 'react';
import { Car, Users, AlertTriangle, Package, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/admin/data-table/data-table';
import {
  createAvatarColumn,
  createStatusColumn,
  createTabularColumn,
  createTextColumn,
  createActionsColumn,
} from '@/components/admin/data-table/column-helpers';
import { FilterBar } from '@/components/admin/data-table/filter-bar';
import type { FilterConfig } from '@/components/admin/data-table/filter-bar';
import type { PillVariant } from '@/components/ui/status-pill';
import { toast } from '@/components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Stat } from '@/components/ui/stat';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer } from '@/components/ui/drawer';
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

// ---------------------------------------------------------------------------
// Mock driver data
// ---------------------------------------------------------------------------
type DriverStatus = 'online' | 'busy' | 'offline';

interface MockDriver {
  id: string;
  name: string;
  avatar: string | null;
  status: DriverStatus;
  rating: number;
  vehicle: string;
  trips: number;
}

const STATUS_LABELS: Record<DriverStatus, string> = {
  online: 'Disponible',
  busy: 'En viaje',
  offline: 'Sin conexión',
};

const mockDrivers: MockDriver[] = Array.from({ length: 50 }, (_, i) => {
  const statuses: DriverStatus[] = ['online', 'busy', 'offline'];
  return {
    id: String(i + 1),
    name: `Conductor ${i + 1}`,
    avatar: null,
    status: statuses[i % 3] as DriverStatus,
    rating: Number((3.5 + (i % 15) * 0.1).toFixed(1)),
    vehicle: `${['Toyota', 'Volkswagen', 'Ford', 'Chevrolet'][i % 4]} ${['Corolla', 'Gol', 'Focus', 'Cruze'][i % 4]}`,
    trips: 20 + i * 3,
  };
});

// ---------------------------------------------------------------------------
// DataTable showcase filters config
// ---------------------------------------------------------------------------
const driverFilters: FilterConfig[] = [
  { id: 'search', type: 'search', placeholder: 'Buscar conductor...' },
];

export function ShowcaseClient() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'dense'>('comfortable');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switchVal, setSwitchVal] = useState(false);
  const [selectVal, setSelectVal] = useState('');
  const [comboVal, setComboVal] = useState('');
  const [page, setPage] = useState(1);
  const [skeletonLoading] = useState(true);

  // DataTable state
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<Error | null>(null);
  const [tableFilters, setTableFilters] = useState<Record<string, unknown>>({ search: '' });
  const [tablePage, setTablePage] = useState(0);
  const PAGE_SIZE = 10;

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

      {/* DataTable */}
      <DataTableShowcase
        tableLoading={tableLoading}
        setTableLoading={setTableLoading}
        tableError={tableError}
        setTableError={setTableError}
        tableFilters={tableFilters}
        setTableFilters={setTableFilters}
        tablePage={tablePage}
        setTablePage={setTablePage}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataTable showcase sub-component
// ---------------------------------------------------------------------------
interface DataTableShowcaseProps {
  tableLoading: boolean;
  setTableLoading: (v: boolean) => void;
  tableError: Error | null;
  setTableError: (v: Error | null) => void;
  tableFilters: Record<string, unknown>;
  setTableFilters: (v: Record<string, unknown>) => void;
  tablePage: number;
  setTablePage: (v: number) => void;
  pageSize: number;
}

function DataTableShowcase({
  tableLoading,
  setTableLoading,
  tableError,
  setTableError,
  tableFilters,
  setTableFilters,
  tablePage,
  setTablePage,
  pageSize,
}: DataTableShowcaseProps) {
  const driverColumns = useMemo<ColumnDef<MockDriver, unknown>[]>(
    () => [
      createAvatarColumn<MockDriver>(
        (row) => row.avatar,
        (row) => row.name,
      ) as ColumnDef<MockDriver, unknown>,
      createStatusColumn<MockDriver>(
        (row) => ({
          variant: row.status as PillVariant,
          label: STATUS_LABELS[row.status],
        }),
        'driver',
      ),
      createTabularColumn<MockDriver>('rating', 'Rating') as ColumnDef<MockDriver, unknown>,
      createTextColumn<MockDriver>('vehicle', 'Vehículo') as ColumnDef<MockDriver, unknown>,
      createTabularColumn<MockDriver>('trips', 'Viajes', { suffix: '' }) as ColumnDef<MockDriver, unknown>,
      createActionsColumn<MockDriver>([
        {
          icon: <Eye size={14} />,
          label: 'Ver detalle',
          onClick: (row) => toast.info(`Ver: ${row.name}`),
        },
        {
          icon: <Pencil size={14} />,
          label: 'Editar',
          onClick: (row) => toast.info(`Editar: ${row.name}`),
        },
        {
          icon: <Trash2 size={14} />,
          label: 'Eliminar',
          onClick: (row) => toast.error(`Eliminar: ${row.name}`),
          danger: true,
        },
      ]) as ColumnDef<MockDriver, unknown>,
    ],
    [],
  );

  const filteredData = useMemo(() => {
    const search = typeof tableFilters.search === 'string' ? tableFilters.search.toLowerCase() : '';
    return mockDrivers.filter((d) =>
      search ? d.name.toLowerCase().includes(search) : true,
    );
  }, [tableFilters]);

  const paginatedData = useMemo(
    () => filteredData.slice(tablePage * pageSize, (tablePage + 1) * pageSize),
    [filteredData, tablePage, pageSize],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--neutral-800)]">DataTable</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTableLoading(!tableLoading)}
          >
            {tableLoading ? 'Quitar carga' : 'Simular carga'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setTableError(tableError ? null : new Error('Error de conexión simulado'))
            }
          >
            {tableError ? 'Quitar error' : 'Simular error'}
          </Button>
        </div>
      </div>

      <FilterBar
        filters={driverFilters}
        value={tableFilters}
        onChange={(v) => {
          setTableFilters(v);
          setTablePage(0);
        }}
      />

      <DataTable<MockDriver, unknown>
        columns={driverColumns}
        data={paginatedData}
        loading={tableLoading}
        error={tableError}
        getRowId={(row) => row.id}
        onRowClick={(row) => toast.info(`Row clickeado: ID ${row.id}`)}
        pagination={{
          pageIndex: tablePage,
          pageSize,
          total: filteredData.length,
          onChange: ({ pageIndex }) => setTablePage(pageIndex),
        }}
      />
    </section>
  );
}
