# 11 — Seguridad proporcional al proyecto

Aunque sea un sistema RP, estará publicado en Internet. Implementar seguridad básica correctamente cuesta poco y evita problemas.

## Secretos

Nunca exponer:

- Supabase secret/service role key.
- Discord webhook URLs.

No loggear secretos.

`.env*` fuera de git salvo `.env.example` sin valores.

## Contraseñas

- Supabase Auth realiza hashing.
- No almacenar contraseña en `profiles`.
- No mostrar contraseñas existentes.
- En reset, establecer una nueva.
- Recomendación UI: generar 10–16 caracteres legibles o permitir una definida por admin con mínimo razonable.

## Autorización

Cada endpoint:

1. verificar auth user,
2. leer profile,
3. comprobar `active`,
4. comprobar rol si corresponde.

Nunca confiar en `role` recibido del cliente.

## Validación

Usar esquema compartido, por ejemplo Zod si resulta adecuado.

Validar:

- username,
- nombres,
- placa,
- quantityLabel,
- UUID,
- image MIME/size,
- filtros y paginación.

## XSS / Discord injection

React escapa UI por defecto; no usar `dangerouslySetInnerHTML` con datos de usuario.

En Discord:

- `allowed_mentions.parse=[]`.
- No interpretar plantillas suministradas por usuario.

## CSRF

Usar cookies seguras y patrones recomendados por Next.js/Supabase SSR. Para Route Handlers que mutan estado, validar origen cuando corresponda y preferir same-site cookies.

## Storage

- Bucket privado.
- Nombres de archivo generados por UUID, nunca confiar en filename suministrado.
- Validar MIME y magic bytes si se procesan en servidor.
- No guardar SVG subido por usuarios en V1.

## Datos RP

La app debe advertir que solo se use para información ficticia del servidor y no para documentos personales reales.

## Rate limiting

V1 no necesita Redis.

Mínimo:

- Debounce de búsqueda.
- Evitar doble submit.
- Idempotencia de entregas.
- Login protegido principalmente por Supabase Auth.

Si aparece abuso real, añadir un rate limiter persistente en una fase posterior.

## Errores/logs

- Usuario: mensaje simple.
- Servidor: log estructurado sin secretos, passwords ni bytes de documentos.
- No loggear OCR completo si contiene datos no necesarios.

## Dependencias

- Mantener lockfile.
- Ejecutar auditoría compatible con pnpm durante mantenimiento.
- Evitar paquetes abandonados cuando exista alternativa estable.
