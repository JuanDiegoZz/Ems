# 08 — OCR e imágenes

## Meta

Extraer automáticamente `NOMBRE` y `APELLIDO` de la INE del roleplay para reducir escritura manual.

## Restricción esencial

OCR propone; humano confirma.

Nunca crear una persona de forma silenciosa solo con el texto reconocido.

## Pipeline cliente

1. Usuario toma/selecciona imagen.
2. Leer dimensiones y orientación.
3. Reducir tamaño máximo (recomendación inicial: 1600 px lado mayor).
4. Generar versión comprimida WebP/JPEG de calidad razonable.
5. Preparar una copia para OCR con contraste/escala si ayuda.
6. Lazy-load Tesseract.js.
7. Ejecutar OCR en Web Worker.
8. Parsear campos.
9. Mostrar preview y campos editables.
10. Confirmar.
11. Subir imagen comprimida, no el original innecesariamente grande.

## Estrategia OCR

### Primera opción: parseo por labels

Buscar líneas cercanas a:

- `APELLIDO`
- `NOMBRE`

Normalizar OCR:

- trim,
- espacios múltiples,
- uppercase para parseo,
- caracteres extraños alrededor de labels.

### Fallback: regiones relativas

Si el diseño de las INE RP es consistente, usar zonas porcentuales de la imagen para recortar el área de apellido/nombre.

No usar coordenadas de píxel absolutas: las capturas tendrán distintas resoluciones.

### Fallback final

Si no se puede extraer con confianza:

- mantener la imagen,
- dejar nombre/apellido vacíos o con mejor hipótesis,
- usuario escribe/corrige manualmente.

## Confianza

Mostrar señal de confianza, no bloquear por umbral.

Ejemplo:

```text
Nombre: Manolo       Alta
Apellido: Durango    Media
```

## Normalización de nombres

Guardar display original confirmado por usuario.

Generar `search_name` aparte:

```text
Ábigaíl   Nguyen -> abigail nguyen
MANOLO   DURANGO -> manolo durango
```

## Duplicados

Antes de crear:

1. Exact match de `search_name`.
2. Para policía, exact match de `badge_number` tiene prioridad.
3. Mostrar coincidencias parciales de nombre si existen.

No bloquear por nombre igual, porque dos personas podrían compartir nombre.

## Storage

- Bucket privado `rp-documents`.
- Preferir WebP cuando el navegador lo soporte.
- Rechazar tipos que no sean imagen.
- Límite de aplicación recomendado después de compresión: <= 1.5 MB por archivo.
- No usar transformaciones de imagen de pago del proveedor en V1.

## Privacidad

- No crear URL pública permanente.
- Para ver un documento, el servidor puede devolver una URL firmada de corta duración o proxy autenticado.
- Para Discord, el servidor descarga bytes privados y los adjunta al webhook.

## Rendimiento móvil

- OCR solo cuando se necesita.
- Mostrar progreso.
- Evitar procesar la imagen a resolución original si es enorme.
- Liberar workers/blobs/URLs temporales después de uso.
