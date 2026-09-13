# 17 — Definition of Done V1

V1 está terminada solo cuando todo lo siguiente es verdadero.

## Auth

- [ ] No existe registro público.
- [ ] Login usa username + password.
- [ ] Admin puede crear cuenta.
- [ ] Admin puede resetear password.
- [ ] Admin puede desactivar/activar.
- [ ] Usuario desactivado queda bloqueado en servidor.

## Civil

- [ ] Se puede buscar por nombre.
- [ ] Civil nuevo puede registrarse con INE.
- [ ] OCR propone nombre/apellido.
- [ ] Se puede corregir OCR.
- [ ] Duplicados se advierten.
- [ ] Entrega civil se registra.
- [ ] Discord recibe formato correcto + INE.

## Policía

- [ ] Búsqueda por nombre y placa.
- [ ] Policía nuevo requiere placa.
- [ ] Guarda INE + placa.
- [ ] Entrega policial se registra.
- [ ] Discord recibe formato correcto + ambos adjuntos.

## Entregas

- [ ] Fecha sale de sistema, no del usuario.
- [ ] `Atendió` sale de sesión.
- [ ] Doble submit no crea duplicado.
- [ ] Si Discord falla, DB conserva entrega failed.
- [ ] Se puede reintentar sin duplicar.

## Historial

- [ ] Historial general paginado.
- [ ] Historial por persona.
- [ ] Muestra EMS, cantidad, fecha/hora y estado.

## UI

- [ ] 360 px usable.
- [ ] Desktop usable.
- [ ] Touch targets adecuados.
- [ ] Loading/error/success visibles.
- [ ] PWA instalable en navegadores compatibles.

## Seguridad

- [ ] Webhooks solo en servidor.
- [ ] Secret key solo en servidor.
- [ ] Storage privado.
- [ ] No hay passwords en DB propia/logs.
- [ ] `allowed_mentions` bloquea menciones Discord.
- [ ] Permisos validados server-side.

## Calidad

- [ ] `pnpm lint` pasa.
- [ ] `pnpm typecheck` pasa.
- [ ] `pnpm test` pasa.
- [ ] `pnpm test:e2e` pasa en flujos críticos.
- [ ] `pnpm build` pasa.
- [ ] Sin errores relevantes en consola.

## Producción

- [ ] Deploy Vercel operativo.
- [ ] Supabase configurado.
- [ ] 2 webhooks configurados.
- [ ] Admin inicial creado.
- [ ] Smoke test real completo.
