> **Borrador para revisión con cliente. Versión 0.1.0**

# Brand Kit — [NOMBRE]

Documentación de marca para la app de remisería. Este directorio contiene la capa narrativa: cómo se siente y qué dice la marca. Los tokens visuales (colores, tipografía, espaciado) están en `packages/design-system/`.

---

## Estado de documentos

| Documento | Estado | Descripción |
|-----------|--------|-------------|
| [voice_tone.md](voice_tone.md) | Borrador 0.1.0 | Personalidad, voz, tono, glosario, 10 mensajes canónicos |
| [naming.md](naming.md) | Borrador 0.1.0 | 11 candidatos de nombre con análisis — **decisión pendiente del cliente** |
| [logo_brief.md](logo_brief.md) | Borrador 0.1.0 | Brief para diseñador gráfico — listo para enviar salvo nombre final |
| [visual_narrative.md](visual_narrative.md) | Borrador 0.1.0 | Fotografía, ilustración, iconografía custom, soundscape, motion |
| [copy_library.md](copy_library.md) | Borrador 0.1.0 | 73 strings con IDs estables, semilla para i18n futuro |
| [social_landing_brief.md](social_landing_brief.md) | Borrador 0.1.0 | Brief de landing público y posts de lanzamiento |

---

## Decisiones pendientes del cliente

- [ ] **Nombre comercial** — ver candidatos en [naming.md](naming.md). Sin este dato no se puede avanzar con logo ni stores.
- [ ] **Número de teléfono de la agencia** — aparece como placeholder `02954-XXXXXX` en copy y FAQ.
- [ ] **Nombre y dirección de la agencia** — footer del landing.
- [ ] **Tarifas por zona** — tabla placeholder en [social_landing_brief.md](social_landing_brief.md).
- [ ] **Horario de operación** — mencionado en FAQ pero sin valor real.

---

## Relación con otros documentos

- **Design system visual** → `packages/design-system/` (tokens de color, tipografía, espaciado)
- **Biblia visual** → `docs/plan_maestro_trayectoria/00_design_language.md`
- **Docs legales** → `docs/legal/` (privacidad, términos, AAIP)

---

## Notas de uso

**Placeholder `[NOMBRE]`** — todos los documentos usan `[NOMBRE]` donde iría el nombre comercial de la app. Una vez decidido, reemplazar globalmente.

**Copy library como fuente de i18n** — los IDs en [copy_library.md](copy_library.md) (formato `categoria.contexto.accion`) están diseñados para ser parseados a JSON/ARB en el futuro. No cambiar el formato de IDs sin coordinar con desarrollo.

**Logo brief** — [logo_brief.md](logo_brief.md) está listo para enviar a un diseñador externo. Solo le falta el nombre final para el wordmark.
