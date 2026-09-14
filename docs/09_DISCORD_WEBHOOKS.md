# 09 — Discord Webhooks

## Webhooks

V1 usa exactamente dos secretos:

- `DISCORD_WEBHOOK_CIVIL`
- `DISCORD_WEBHOOK_POLICE`

Bitácoras usa un webhook independiente por EMS, cifrado en la tabla privada `ems_discord_webhooks`. Configurar `EMS_WEBHOOK_ENCRYPTION_KEY` en `.env.local` y Vercel como **base64 de exactamente 32 bytes** (por ejemplo, generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). No es `NEXT_PUBLIC_*`, nunca se registra y la URL no vuelve al browser después de guardarse.

Discord es secundario: una bitácora se confirma en DB antes del intento de notificación. Un error deja el turno válido y registra un estado/error sanitizado. El mensaje de apertura indica EMS, inicio y `En servicio`; el de cierre añade fin y duración.

Cada uno apunta al canal de Discord correspondiente.

## Seguridad

- Solo variables de entorno de servidor.
- Nunca `NEXT_PUBLIC_*`.
- Nunca renderizar URL en UI.
- Nunca registrarla completa en logs.
- Si se filtra, regenerar en Discord.

## Civil

Contenido exacto base:

```text
**Entrega de Kit Civil**
**♡ Atendió:** {rpName}
**♡ Nombre del civil:** {displayName}
**♡ Fecha de Entrega:** {DD / MM / YYYY}
**♡ Cantidad de vendajes:** {quantityLabel}
```

Adjunto:

- INE.

## Policial

```text
**Entrega de Kit Policial**
**♡ Atendió:** {rpName}
**♡ Placa:** {badgeNumber}
**♡ Fecha de Entrega:** {DD / MM / YYYY}
**♡ Cantidad de vendajes:** {quantityLabel}
```

Adjuntos:

- INE.
- Placa.

## Fecha

- `occurred_at` se guarda UTC.
- Renderizar usando `APP_TIMEZONE`.
- Formato: `DD / MM / YYYY`.
- El historial sí puede mostrar hora; el template de Discord V1 conserva el formato solicitado con fecha solamente.

## Ejecución

Usar `multipart/form-data`:

- `payload_json` con `content`, `allowed_mentions`.
- `files[0]` INE.
- `files[1]` placa si policial.

Usar `?wait=true` para recibir la respuesta del mensaje.

## Prevención de menciones

Siempre:

```json
{"allowed_mentions":{"parse":[]}}
```

Así un nombre malicioso no genera `@everyone` ni menciones.

## Errores

Clasificar internamente:

- webhook no configurado,
- webhook inválido/eliminado,
- rate limit,
- fallo temporal de red,
- archivo no disponible,
- respuesta Discord inesperada.

No enseñar stack trace al usuario.

## Reintentos

No hacer loops infinitos.

V1:

- 1 intento normal.
- Si rate limit trae `retry_after`, puede hacerse un único reintento controlado si es corto.
- Si falla, marcar `failed` y permitir reintento manual.

El reintento usa `deliveryId`, nunca crea otra entrega.
