// Escapa un valor para usarlo dentro de una expresion PostgREST `.or(...)`.
// Reemplaza los chars que rompen el parser PostgREST (, ( ) \) y los wildcards
// de `like`/`ilike` (% _) para que la busqueda no permita inyeccion ni
// matchee mas filas de las pretendidas.
export function escapeOrFilter(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
