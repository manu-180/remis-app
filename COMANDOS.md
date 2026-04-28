# Comandos del proyecto remis_app

## App Pasajero (Flutter - Android)

```powershell
cd "C:\MisProyectos\clientes\remis_app\apps\passenger"; flutter run -d PNCQCINN7PXSAQOJ --dart-define-from-file=env/dev.json
```

## App Conductor (Flutter - Android)

```powershell
cd "C:\MisProyectos\clientes\remis_app\apps\driver"; flutter run -d PNCQCINN7PXSAQOJ --dart-define-from-file=env/dev.json
```

## Web (Next.js)

```powershell
cd "C:\MisProyectos\clientes\remis_app\apps\web"; pnpm dev
```

---

> El flag `--dart-define-from-file=env/dev.json` inyecta las credenciales de Supabase.
> El archivo `env/dev.json` NO se sube al repo (está en .gitignore).
