# Skill Registry — app-antojos-mobile-v2

**Generado**: 2026-11-12
**Fuente**: escaneo de `~/.config/opencode/skills/` + skills de nivel proyecto.

## Skills de usuario (globales)

| Skill | Trigger principal | Relevancia para este repo |
|-------|-------------------|---------------------------|
| `sdd-explore` | Explorar ideas antes de un cambio | Alto — fase de descubrimiento |
| `sdd-propose` | Crear propuesta de cambio | Alto |
| `sdd-spec` | Escribir specs con escenarios | Alto |
| `sdd-tasks` | Desglosar en tareas | Alto |
| `sdd-apply` | Implementar tareas | Alto |
| `sdd-verify` | Verificar contra specs | Alto |
| `sdd-design` | Documento de diseño técnico | Medio |
| `sdd-archive` | Archivar cambio completado | Medio |
| `react-best-practices` | React/Next performance | Medio — Next 16 + React 19 |
| `frontend-design` | Dirección estética de UI | Bajo — este cambio es backend |
| `impeccable` | Auditoría de UI/UX | Bajo — fuera de scope |
| `web-design-guidelines` | Accesibilidad y Web Interface Guidelines | Bajo |
| `judgment-day` | Doble revisión adversarial | Medio — útil para el gate de seguridad |
| `branch-pr` | Crear PR (issue-first) | Bajo — flujo local por ahora |
| `issue-creation` | Crear issue en GitHub | Bajo |
| `scrum-backlog` | Backlog Scrum en `docs/backlog.json` | Bajo — no hay `docs/backlog.json` |
| `go-testing` | Tests de Go / Bubbletea | N/A — este repo es TS |
| `estudio-juridico-design` | UX para estudios jurídicos | N/A — otro proyecto (lic-arias) |
| `ppt-generator` | Generar .pptx | N/A |
| `skill-creator` | Crear nuevas skills | N/A |

## Convenciones del proyecto

| Archivo | Reglas clave |
|---------|--------------|
| `AGENTS.md` | Next.js 16 tiene breaking changes; leer `node_modules/next/dist/docs/` antes de codear. Se re-agrega automáticamente con `next dev`. |
| `CLAUDE.md` | Reglas de persona: no build, no atribución IA en commits, conventional commits, verificar antes de agreeing. |
| `openspec/config.yaml` | Contexto del stack, reglas por fase, `strict_tdd: false`. |

## Gotchas técnicas registradas

- `middleware.ts` está deprecado en Next 16 → migrar a `proxy.ts` (pendiente).
- Drizzle `timestamp({ withTimezone: true })` requiere **objeto `Date`**, no ISO string.
- `DATABASE_URL` usa pooler Supabase en transaction mode (puerto 6543) → `prepare: false` obligatorio.
- `postgres.js` con `postgres.<ref>` requiere host `aws-[INDEX]-[REGION].pooler.supabase.com` (INDEX 0 o 1 en us-west-2).
- La app usa `@base-ui/react`, NO Radix → `asChild` no existe, usar prop `render`.
