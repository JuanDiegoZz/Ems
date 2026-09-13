# 10 — Contratos de API internos

Los nombres pueden implementarse con Route Handlers o Server Actions, pero conservar estos contratos conceptuales.

Todas las respuestas de error deben usar una forma consistente:

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
```

## Auth

### POST `/api/auth/login`

Request:

```json
{"username":"daniel","password":"..."}
```

Response:

```json
{"user":{"id":"uuid","username":"daniel","rpName":"Daniel","role":"ems"}}
```

### POST `/api/auth/logout`

204.

### GET `/api/me`

Devuelve perfil activo actual.

## Personas

### GET `/api/people?q=manolo&type=civil`

Devuelve máximo 10–20 resultados ligeros.

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "civil",
      "displayName": "Manolo Durango",
      "badgeNumber": null,
      "hasIne": true,
      "hasBadge": false
    }
  ]
}
```

### POST `/api/people/duplicates`

```json
{"type":"civil","firstName":"Manolo","lastName":"Durango","badgeNumber":null}
```

### POST `/api/people`

Crear persona tras documentos subidos.

### PATCH `/api/people/:id`

Admin solamente.

### POST `/api/people/:id/archive`

Admin solamente.

## Uploads

### POST `/api/uploads/sign`

Request:

```json
{"kind":"ine","contentType":"image/webp","size":245123}
```

Response con información necesaria para subida directa firmada o mecanismo equivalente.

Validar sesión, tipo y tamaño antes de firmar.

## Documentos

### GET `/api/people/:id/documents/ine`

Retorna redirect/JSON con URL firmada corta o proxy de bytes.

Nunca una URL pública permanente.

## Entregas

### POST `/api/deliveries`

```json
{
  "clientRequestId": "uuid",
  "personId": "uuid",
  "quantityLabel": "10x10"
}
```

El servidor infiere:

- usuario que atendió,
- tipo civil/police desde persona,
- webhook,
- fecha/hora.

Respuesta éxito:

```json
{
  "delivery": {
    "id":"uuid",
    "status":"sent",
    "discordMessageId":"...",
    "occurredAt":"ISO8601"
  }
}
```

Respuesta webhook fallido puede ser HTTP 200/202 con estado de negocio `failed` para reflejar que el registro sí quedó guardado. Elegir una convención y mantenerla consistente.

### POST `/api/deliveries/:id/retry`

Reintenta Discord para una entrega `failed`.

## Historial

### GET `/api/history?type=&q=&from=&to=&cursor=`

Paginación por cursor/fecha, no cargar todo.

## Admin usuarios

### GET `/api/admin/users`

Admin.

### POST `/api/admin/users`

```json
{
  "username":"abigail",
  "rpName":"Abigaíl Nguyen",
  "role":"ems",
  "password":"initial-password"
}
```

### POST `/api/admin/users/:id/reset-password`

### POST `/api/admin/users/:id/disable`

### POST `/api/admin/users/:id/enable`

### PATCH `/api/admin/users/:id/profile`

Cambiar `rpName`/rol; username inmutable V1.
