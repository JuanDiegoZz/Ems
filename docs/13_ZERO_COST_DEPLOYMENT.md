# 13 — Despliegue con costo objetivo $0

## Objetivo

Operar V1 sin pagar mientras el proyecto sea pequeño, de hobby/no comercial y permanezca dentro de los términos/cuotas de los proveedores.

No afirmar que será gratis para siempre: los límites y condiciones pueden cambiar.

## Componentes

### GitHub

- Repositorio privado o público según preferencia del dueño.
- Nunca commitear secretos.

### Vercel Hobby

Hospeda Next.js.

Plan actual consultado al preparar estos documentos: Hobby aparece a $0/mes y está orientado a uso personal/no comercial.

V1 usa dominio `nombre.vercel.app`; no comprar dominio.

### Supabase Free

Plan actual consultado:

- $0/mes.
- 500 MB de base de datos.
- 1 GB de Storage.
- 5 GB de egress.
- 50,000 MAU.
- Los proyectos Free pueden pausarse después de una semana de inactividad.

Estas cuotas son más que suficientes para iniciar un EMS pequeño, pero hay que monitorizarlas.

### Discord

Incoming Webhooks no requieren un bot persistente para publicar mensajes.

### OCR

Tesseract.js corre localmente en el navegador; no se paga por escaneo.

## Estrategia para conservar cuota

- Comprimir INE/placa antes de subir.
- Una sola copia por persona.
- No subir el mismo documento en cada entrega.
- No usar Image Transformations de Supabase en V1.
- Paginación de historial.
- OCR client-side.
- Evitar polling/realtime innecesario.

## Estimación simple de Storage

Si una imagen comprimida promedio fuera ~100 KB, 1 GB permitiría aproximadamente miles de imágenes. No usar esta cifra como garantía: tamaño real y overhead varían.

## Paso a paso de producción

### 1. Crear proyecto Supabase

- Crear proyecto Free.
- Elegir región razonable para la mayoría de jugadores.
- Copiar URL, publishable key y secret/service key.
- Ejecutar migraciones del repo.
- Crear bucket privado `rp-documents`.

### 2. Crear webhooks Discord

- Canal Civil → crear webhook → guardar URL.
- Canal Policía → crear webhook → guardar URL.
- No pegar URLs en código.

### 3. Crear proyecto Vercel

- Importar repo GitHub.
- Framework detectado Next.js.
- Package manager: pnpm por lockfile.
- Añadir variables de entorno.
- Deploy.

### 4. URLs de Auth

Configurar Site URL/redirects de Supabase según URL final de Vercel si la integración SSR los necesita.

### 5. Crear primer admin

Usar script `pnpm admin:create` que el proyecto debe implementar o procedimiento documentado equivalente.

### 6. Smoke test producción

- Login admin.
- Crear usuario EMS de prueba.
- Registrar civil ficticio.
- Enviar kit.
- Verificar mensaje/archivo en Discord.
- Desactivar usuario de prueba.

## Free tier y actividad

Supabase Free puede pausar un proyecto tras inactividad. Para este caso no intentar “mantenerlo despierto” con tráfico artificial. Si se pausa, reactivarlo desde el panel cuando sea necesario o evaluar plan superior si el uso real lo justifica.

## Cuándo deja de ser $0

Revisar alternativas/plan si:

- el proyecto se vuelve comercial,
- Vercel Hobby ya no aplica por términos,
- se supera Storage/egress/DB,
- se necesita alta disponibilidad,
- el sistema se vuelve crítico.
