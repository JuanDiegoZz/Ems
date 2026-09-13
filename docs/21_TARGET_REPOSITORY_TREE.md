# 21 — Árbol objetivo del repositorio

Estructura sugerida; Codex puede ajustarla si mantiene separación clara.

```text
ems-rp-hospital/
├─ AGENTS.md
├─ README.md
├─ CODEX_START_HERE.md
├─ docs/
├─ public/
│  ├─ icons/
│  └─ sw.js
├─ scripts/
│  └─ create-admin.ts
├─ src/
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  └─ login/
│  │  ├─ (app)/
│  │  │  ├─ page.tsx
│  │  │  ├─ civil/
│  │  │  ├─ police/
│  │  │  ├─ people/
│  │  │  ├─ history/
│  │  │  └─ admin/users/
│  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  ├─ people/
│  │  │  ├─ uploads/
│  │  │  ├─ deliveries/
│  │  │  └─ admin/
│  │  ├─ manifest.ts
│  │  ├─ layout.tsx
│  │  └─ globals.css
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ app-shell/
│  │  ├─ people/
│  │  ├─ delivery/
│  │  └─ ocr/
│  ├─ lib/
│  │  ├─ auth/
│  │  ├─ supabase/
│  │  ├─ discord/
│  │  ├─ storage/
│  │  ├─ ocr/
│  │  ├─ validation/
│  │  ├─ formatting/
│  │  └─ permissions/
│  ├─ server/
│  │  ├─ people.ts
│  │  ├─ deliveries.ts
│  │  └─ users.ts
│  └─ types/
├─ supabase/
│  ├─ migrations/
│  └─ tests/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ fixtures/
├─ e2e/
├─ .env.example
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ playwright.config.ts
```

## Convenciones

- `lib/`: funciones puras/adaptadores.
- `server/`: casos de uso de negocio server-only.
- `components/`: presentación/interacción.
- API handlers delgados; delegan a `server/`.
- Builders Discord puros y testeables.
- Parser OCR puro separado del worker Tesseract.
