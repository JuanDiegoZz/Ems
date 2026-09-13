# 03 — Especificación UX/UI

## Filosofía

La aplicación se usa mientras el usuario está jugando. Debe exigir poca atención y pocos toques.

## Diseño mobile-first

### Navegación móvil

- Header compacto con nombre de app y menú.
- Inicio con 3 acciones grandes:
  - `Kit Civil`
  - `Kit Policial`
  - `Buscar persona`
- Navegación inferior opcional si mejora pruebas de usabilidad, máximo 4 destinos.

### Desktop

Sidebar discreto:

- Inicio
- Kit Civil
- Kit Policial
- Personas
- Historial
- Personal EMS (solo admin)
- Configuración/Ayuda

## Pantalla Inicio

Contenido principal:

- `Hola, {rpName}`.
- Botón grande Kit Civil.
- Botón grande Kit Policial.
- Botón Buscar persona.
- Resumen pequeño opcional: entregas de hoy y último envío.

No convertir Inicio en dashboard analítico.

## Buscadores

- Foco automático al abrir flujo.
- Debounce ~200–300 ms.
- Buscar por nombre normalizado.
- Policía: también por número de placa.
- Resultados grandes, fáciles de tocar.
- Estado vacío útil: `No encontramos a esta persona` + CTA de registro.

## Formularios

- Labels visibles; no depender solo de placeholders.
- Errores debajo del campo.
- Botones táctiles >= 44 px.
- CTA principal siempre reconocible.
- No más de una acción primaria visual por pantalla.

## Cantidad

Mientras el significado de `10x10` no se confirme, usar:

- Presets configurables: `10x10`, `20x20`, `40x40`.
- Campo `Otra cantidad` con formato corto.
- Guardar como `quantityLabel`.

Validación inicial:

- 1–32 caracteres.
- Solo números, `x`, `X`, espacios y, si se decide, `-`.
- Normalizar `10 X 10` → `10x10`.

## OCR

Estados:

1. `Preparando imagen…`
2. `Leyendo INE…`
3. `Revisa los datos detectados`
4. Campos editables.
5. Si confianza baja: aviso ámbar, nunca bloqueo absoluto.

## Feedback

- Loading visible en operaciones >300 ms.
- Toast de éxito, pero también cambiar pantalla/estado; no depender solo del toast.
- Error de webhook: mensaje persistente con reintento.
- Doble clic: CTA deshabilitado durante request.

## Accesibilidad

- Contraste AA como objetivo.
- Focus states visibles.
- Navegable con teclado en desktop.
- `aria-label` en iconos sin texto.
- No comunicar estados únicamente con color.

## PWA

- Manifest con nombre `EMS Hospital`.
- Iconos 192/512.
- `display: standalone`.
- Theme color sobrio.
- Service worker simple para shell estático; no cachear datos sensibles ni respuestas autenticadas.
- No implementar escritura offline en V1.

## Visual

Estética: hospital moderno, limpia, profesional y calmada.

Evitar:

- Neón excesivo.
- Gradientes fuertes.
- Tablas comprimidas en móvil.
- Animaciones largas.
- Más de 2 niveles de navegación para tareas principales.
