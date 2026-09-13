# 02 — Flujos de usuario

## A. Login

1. Abrir aplicación.
2. Ingresar `Usuario` y `Contraseña`.
3. Enviar.
4. Servidor deriva el email interno reservado a partir del username y autentica con Supabase Auth.
5. Verificar que el perfil esté activo.
6. Redirigir a Inicio.

No existe botón `Registrarse`.

## B. Civil existente

1. Inicio → `Kit Civil`.
2. Foco automático en buscador.
3. Escribir parte del nombre.
4. Elegir resultado.
5. Mostrar nombre + indicador `INE guardada`.
6. Elegir cantidad mediante presets o campo corto.
7. `Registrar y enviar`.
8. Botón queda deshabilitado mientras se procesa.
9. Crear entrega con `clientRequestId` único.
10. Enviar mensaje + INE al webhook civil.
11. Guardar `discordMessageId` y estado `sent`.
12. Mostrar éxito y acción `Nueva entrega`.

## C. Civil nuevo

1. Kit Civil → búsqueda sin coincidencia.
2. `Registrar con INE`.
3. Tomar/seleccionar imagen.
4. Comprimir/preprocesar localmente.
5. Ejecutar OCR en navegador.
6. Mostrar nombre y apellido detectados en campos editables.
7. Ejecutar comprobación de duplicados.
8. Si hay coincidencia probable, ofrecer `Usar registro existente` antes de crear.
9. Confirmar.
10. Subir INE a Storage privado.
11. Crear persona civil.
12. Continuar directamente a la entrega.

## D. Policía existente

1. Inicio → `Kit Policial`.
2. Buscar por nombre o placa.
3. Seleccionar policía.
4. Mostrar nombre, placa, INE guardada y placa guardada.
5. Elegir cantidad.
6. Registrar y enviar.
7. Discord recibe plantilla policial + ambos archivos.

## E. Policía nuevo

1. Búsqueda sin resultado → `Registrar policía`.
2. Subir INE.
3. OCR → confirmar nombre/apellido.
4. Escribir número de placa.
5. Subir foto/captura de placa.
6. Comprobar duplicado por nombre normalizado o placa exacta.
7. Confirmar.
8. Subir documentos.
9. Crear persona.
10. Continuar a entrega.

## F. Error de Discord

1. La entrega se crea como `pending`.
2. Si Discord falla, pasa a `failed` con mensaje técnico sanitizado.
3. UI dice: `La entrega quedó guardada, pero no se envió a Discord.`
4. Mostrar `Reintentar envío`.
5. El reintento reutiliza la misma entrega. No crea una nueva.
6. Si funciona, estado `sent`.

## G. Administrar usuarios

1. Admin → Personal EMS.
2. `Crear usuario`.
3. Ingresar username, nombre RP, rol y contraseña inicial o generar una.
4. Crear usuario confirmado en Supabase Auth y perfil.
5. Mostrar credenciales solo como resultado de esa operación; no almacenar contraseña legible.
6. Para reset: admin establece una nueva contraseña.
7. Para salida del EMS: `Desactivar` en vez de borrar.

## H. Editar una persona

V1: solo admin.

- Cambiar nombre/apellido.
- Cambiar placa.
- Reemplazar INE.
- Reemplazar foto de placa.
- Archivar persona.

No borrar historial de entregas.
