# Action Items (from external review)

Actionable improvements based on code review. Ordered by priority/impact.

---

## 1. CI/CD

- [ ] Add `.github/workflows/ci.yml` — run `lint`, `test`, `build` on push/PR (optionally with coverage thresholds)
- [ ] Add `.env.example` — document `DETECT_REGIONS_PYTHON`, port, and other env vars
- [ ] Add `Dockerfile` — containerized deployment
- [ ] Add `docker-compose.yml` — support for Python region-detection dependency

---

## 2. Testing

- [ ] Extract and test ImageViewer pure functions (`polygonCentroid`, `shrinkPolygon`, `polygonToPath`) — move to utils and add tests; remove or reduce ImageViewer coverage exclusion
- [ ] Add server-side tests — Express routes, `image_processor.js`, `metadata_handler.js`
- [ ] Consider integration/E2E tests for critical flows (upload → detect regions → generate palette)

---

## 3. Architecture / state

- [ ] Refactor App.jsx — consider `useReducer` or context to reduce 12+ useState and prop-drilling (e.g., group regions state: `regions`, `isDeleteRegionMode`, `regionsDetecting` into a regions reducer)
- [ ] Reduce PaletteDisplay props — 17 props is high; use context or grouped props for related data

---

## 4. Server / code quality

- [ ] Remove dead code in `image_processor.js` (lines 35–45, commented)
- [ ] DRY filename validation — extract middleware or `validateFilename()` used by all route handlers
- [ ] Review metadata_handler race condition — `readMetadata` → `rewriteMetadata` under concurrent requests; consider locking or atomic writes if needed for production

---

## 5. Documentation

- [ ] Add deployment section to README — link to ACTIONS.md, Docker instructions, env vars
- [ ] Document metadata_handler concurrency behavior in code comments
