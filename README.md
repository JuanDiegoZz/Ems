# EMS RP Hospital — Handoff para Codex

Sistema web privado para automatizar las entregas de kits del EMS de un servidor de FiveM.

La prioridad del producto es reducir una entrega normal a pocos pasos:

- Civil existente: **buscar → elegir cantidad → enviar**.
- Civil nuevo: **subir INE → OCR → confirmar nombre → elegir cantidad → enviar**.
- Policía existente: **buscar por nombre/placa → elegir cantidad → enviar**.
- Policía nuevo: **subir INE + placa → OCR/confirmación → elegir cantidad → enviar**.

La aplicación debe ser extremadamente sencilla, mobile-first, usable desde PC, tablet y teléfono, instalable como PWA y compartida entre todos los EMS autorizados.

## Stack objetivo

- Next.js + TypeScript
- pnpm
- Tailwind CSS + componentes accesibles
- Supabase: PostgreSQL + Auth + Storage
- Tesseract.js: OCR local en el navegador
- Discord Incoming Webhooks: 2 webhooks (Civil / Policial)
- Vercel Hobby para despliegue
- Vitest + Testing Library + Playwright

## Principios

1. Cero registro público.
2. El administrador crea las cuentas y entrega usuario/contraseña.
3. El usuario normal no tiene UI para cambiar contraseña, usuario, nombre RP ni rol.
4. Fecha/hora y nombre del EMS se obtienen automáticamente.
5. INE y placa se almacenan una vez y se reutilizan.
6. Las imágenes son privadas; nunca se exponen mediante URL pública permanente.
7. Los webhooks nunca llegan al navegador.
8. Toda mutación importante se valida en servidor.
9. El OCR siempre requiere confirmación humana antes de crear una persona.
10. El producto debe seguir siendo sencillo. No añadir módulos hospitalarios no solicitados en V1.

## Orden de lectura para Codex

1. `AGENTS.md`
2. `CODEX_START_HERE.md`
3. `docs/01_PRODUCT_SCOPE.md`
4. `docs/02_USER_FLOWS.md`
5. `docs/03_UX_UI_SPEC.md`
6. `docs/04_TECH_STACK.md`
7. `docs/05_ARCHITECTURE.md`
8. `docs/06_DATABASE.md`
9. `docs/07_AUTH_AND_PERMISSIONS.md`
10. `docs/08_OCR_AND_IMAGES.md`
11. `docs/09_DISCORD_WEBHOOKS.md`
12. `docs/10_API_CONTRACTS.md`
13. `docs/11_SECURITY.md`
14. `docs/12_TESTING_QA.md`
15. `docs/13_ZERO_COST_DEPLOYMENT.md`
16. `docs/14_ENVIRONMENT.md`
17. `docs/15_DEVELOPMENT_PLAN.md`
18. `docs/16_SKILLS_AND_TOOLING.md`
19. `docs/17_DEFINITION_OF_DONE.md`
20. `docs/18_FUTURE_ROADMAP.md`
21. `docs/19_ASSUMPTIONS_AND_DECISIONS.md`
22. `docs/20_HANDOFF_CHECKLIST.md`
23. `docs/21_TARGET_REPOSITORY_TREE.md`
24. `docs/22_REFERENCES.md`

## Alcance de V1

La primera versión incluye:

- Login privado por usuario + contraseña.
- Administrador que crea, desactiva y restablece cuentas.
- Inicio rápido con Kit Civil, Kit Policial y Buscar persona.
- Registro de civiles y policías.
- INE y placa almacenadas en Supabase Storage privado.
- OCR de nombre y apellido desde la INE.
- Confirmación/corrección manual del OCR.
- Búsqueda de personas.
- Prevención básica de duplicados.
- Entregas de kits.
- Historial.
- Dos webhooks de Discord.
- Estado de envío a Discord y reintento si falla.
- PWA y diseño responsive.
- Pruebas automatizadas críticas.
- Despliegue usando planes gratuitos mientras el uso y las condiciones de los proveedores lo permitan.

## Fuera de V1

No construir todavía:

- Inventario completo del hospital.
- Expediente clínico RP avanzado.
- Ambulancias/unidades.
- Nómina.
- Facturación completa.
- Integración directa con recursos de FiveM.
- Bot de Discord persistente.
- Notificaciones push.
- OCR mediante API de IA pagada.

## Nota de producto

Las imágenes y datos son del roleplay. El sistema debe mostrar en configuración/ayuda una advertencia breve: **no subir identificaciones ni datos personales reales**.
