# 01 — Alcance del producto

## Problema

El EMS del servidor de FiveM registra manualmente entregas de kits copiando nombre del EMS, nombre del civil o placa, fecha, cantidad y adjuntando identificaciones en Discord. Este flujo interrumpe el roleplay y consume tiempo.

## Solución

Una web privada compartida por todo el EMS que conozca la identidad del usuario autenticado, reutilice documentos ya registrados y publique automáticamente el registro correcto en Discord.

## Usuarios

### Administrador

- Crea cuentas EMS.
- Restablece contraseñas.
- Activa/desactiva cuentas.
- Cambia nombre RP/rol.
- Corrige o archiva registros de personas.
- Ve todo el historial.

### EMS

- Inicia sesión.
- Busca personas.
- Registra personas nuevas.
- Sube INE y, para policías, placa.
- Confirma datos OCR.
- Registra entregas.
- Consulta historial.
- Reintenta envíos de Discord fallidos cuando corresponda.

## Entidades principales

- Usuario EMS.
- Persona (civil o policía).
- Documento (INE/placa, representado inicialmente como rutas en Storage).
- Entrega.

## Entrega civil en Discord

Formato objetivo:

```text
**Entrega de Kit Civil**
**♡ Atendió:** Abigaíl Nguyen
**♡ Nombre del civil:** Galilea Ayanot
**♡ Fecha de Entrega:** 06 / 09 / 2026
**♡ Cantidad de vendajes:** 10x10
```

Adjunto: INE.

## Entrega policial en Discord

Formato objetivo:

```text
**Entrega de Kit Policial**
**♡ Atendió:** Daniel
**♡ Placa:** 214
**♡ Fecha de Entrega:** 13 / 09 / 2026
**♡ Cantidad de vendajes:** 20x20
```

Adjuntos: INE + placa.

## Objetivos de producto

- Registrar una entrega de una persona existente en segundos.
- Nunca volver a pedir una INE que ya esté guardada, salvo reemplazo voluntario.
- Evitar copiar/pegar plantillas manualmente.
- Eliminar la necesidad de moverse entre varios canales para escribir el registro.
- Mantener una sola base central compartida entre ciudades/dispositivos.
- Funcionar bien en pantalla pequeña.

## No objetivos de V1

- Ser un HIS/EMR real.
- Cumplimiento normativo para datos médicos reales.
- Inventario completo de medicamentos.
- Economía/pagos.
- Integración directa con base de datos de FiveM.
- Bot persistente de Discord.
