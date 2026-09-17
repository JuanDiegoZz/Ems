# 07 — Autenticación y permisos

## Experiencia del usuario

Pantalla:

```text
Usuario
[ daniel ]

Contraseña
[ •••••••• ]

[ Iniciar sesión ]
```

No mostrar:

- Registrarse.
- Olvidé mi contraseña.
- Login social.

## Implementación interna

Usar Supabase Auth para no reinventar:

- hashing de contraseña,
- sesiones,
- refresh tokens,
- cookies.

### Username → email interno

Función única:

```ts
toInternalEmail('Daniel') // daniel@ems.invalid
```

Restricción username recomendada:

```text
[a-z0-9._-]{3,32}
```

El email interno es un detalle de implementación y no se muestra en UI.

## Login

- Server Action o Route Handler.
- Normalizar username.
- `signInWithPassword` usando email interno.
- Leer `profiles`.
- Si `active=false`, cerrar sesión y rechazar.

## Protección de rutas

Crear helpers centrales:

```text
requireSession()
requireActiveProfile()
requireAdmin()
```

Toda operación sensible los usa en servidor.

## Roles

### EMS

Puede:

- leer personas no archivadas,
- registrar persona,
- crear entrega,
- ver historial,
- consultar documentos,
- reintentar una entrega fallida según reglas.

No puede:

- crear/desactivar usuarios,
- cambiar roles,
- reemplazar registros arbitrariamente en V1,
- ver secretos.

### Admin

Todo lo anterior más:

- crear usuario,
- resetear contraseña,
- activar/desactivar,
- editar/archivar personas.

## Crear usuario

Solo servidor con key secreta:

1. Validar username único.
2. Derivar email interno.
3. `auth.admin.createUser` con password y usuario confirmado.
4. Insertar `profiles`.
5. Si falla el perfil, eliminar el auth user creado para evitar estado parcial.

## Reset de contraseña

Admin establece una nueva mediante `auth.admin.updateUserById`.

No guardar password en `profiles` ni logs.

## Cambio de contraseña por EMS

V1 no ofrece interfaz ni endpoint de aplicación para que un EMS cambie su contraseña. Si el dueño necesita una prohibición criptográficamente absoluta frente a un usuario que reverse-engineer APIs del proveedor, eso requeriría un esquema de autenticación propio; no se considera necesario para este proyecto RP.

## Desactivación

No confiar únicamente en invalidar UI.

Cada request protegido debe verificar `profiles.active` para que un usuario ya autenticado quede bloqueado al ser desactivado.

## Staff Discipline + Weekly Bonuses

El Centro de Personal, disciplina, permisos, configuración de bonos, reviews,
overrides y finalización requieren `requireAdmin()` server-side. Sus tablas y
RPCs no tienen grants para `anon`/`authenticated`; el cliente sólo recibe DTOs
sanitizados. Ver [`docs/24_STAFF_DISCIPLINE_AND_BONUSES.md`](24_STAFF_DISCIPLINE_AND_BONUSES.md)
para RLS, grants, snapshots e invariantes.

## Bitácora y rendimiento

EMS y admin activos pueden abrir/cerrar exclusivamente su propia bitácora. Cerrar sesión no altera turnos. Las rutas de webhook y `/admin/ems-performance` requieren `requireAdmin()` en servidor; un EMS nunca recibe ni puede enumerar configuraciones o métricas de otros perfiles.
