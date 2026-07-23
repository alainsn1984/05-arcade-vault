# Spec 02 — Home + reubicación de Biblioteca

**Estado:** Approved
**Depende de:** 01-mvp-pantallas-visuales
**Fecha:** 2026-07-13

**Objetivo:** Portar la landing Home de `references/resources/home-about/home.jsx` a `/` como pantalla de bienvenida real, moviendo la Biblioteca actual (hoy en `/`) a `/biblioteca`.

## Scope

**Incluye:**
- Ruta `/` — Home: hero, sección "por qué Arcade Vault" (4 features), preview de juegos (`GAMES.slice(0,6)` con `MiniCard`, reusando `lib/data.ts`), sección stats (`GAMES.length` dinámico + copy fijo), sección "actividad en vivo" (ticker + top jugadores generados desde `seededScores`/`PLAYERS`), sección pricing (plan único gratis + FAQ estático), CTA final — portado de `home.jsx`.
- Componente `components/Home.tsx` (o similar) con las piezas internas del template (`FloatingSilhouettes`, `MiniCard`, `FeatureIcon`) adaptadas a TSX y `next/navigation`.
- Ruta `/biblioteca` — contenido actual de `app/page.tsx` (grid, búsqueda, filtro por categoría) se mueve tal cual, sin cambios funcionales.
- `components/Nav.tsx` — agregar link "Inicio" → `/`, actualizar lógica `isActive` para que "Biblioteca" resalte en `/biblioteca` (y `/game/*` como hoy), y "Inicio" resalte solo en `/`.
- Estilos: portar el bloque `.home*` / `.home-hero` / `.home-stats` / `.home-final` de `references/resources/home-about/styles.css` a `app/globals.css` (las clases `.about*` del mismo archivo NO se portan, quedan fuera de este spec).
- Todos los CTAs/links del Home apuntan a rutas reales: "EXPLORAR JUEGOS" / "VER TODOS LOS JUEGOS" / "INSERTAR MONEDA" → `/biblioteca`; "CREAR CUENTA" / "EMPEZAR GRATIS" → `/login`; "VER SALÓN" → `/hall-of-fame`; mini-cards → `/game/[id]`.

**NO incluye (fuera de este spec):**
- Pantalla "Acerca de" (`about.jsx`) y su formulario de contacto — spec futuro.
- Cambios a `app/game/*`, `app/login`, `app/hall-of-fame` más allá de que ya existen y son destino de links del Home.
- Nueva lógica de negocio para "actividad en vivo": sigue siendo 100% mock/decorativo, solo cambia la fuente de datos (de arrays hardcodeados del template a funciones ya existentes en `lib/data.ts`).
- Sistema de créditos real (contador del Nav sigue estático, sin cambios).
- Tests automatizados (no hay test runner configurado).

## Modelo de datos

No se introducen tipos ni estructuras nuevas en `lib/data.ts`. El Home consume exclusivamente lo ya existente (`GAMES`, `PLAYERS`, `seededScores`) y arma las listas de UI localmente dentro de `components/Home.tsx`:

- **Preview de juegos:** `GAMES.slice(0, 6)` renderizado con `MiniCard` (cover, título, categoría) — igual forma que `GameCard` de Biblioteca pero versión compacta.
- **Ticker "últimas puntuaciones":** tomar 1 fila de `seededScores(seed, 1)` de ~7 juegos distintos de `GAMES` (seed = índice o hash del `game.id`), armando localmente `{ player: string; gameTitle: string; score: number; color: Game["color"] }` por fila (sin exportar tipo nuevo, solo un `.map` inline).
- **Top jugadores de hoy:** tomar las primeras 5 filas de `seededScores(seed, 5)` de un juego representativo (ej. `GAMES[0]`), reusando `ScoreRow` ya existente (`rank`, `name`, `score`).
- **Stat "JUEGOS":** `` `${GAMES.length}+` `` en vez del `"12+"` hardcodeado del template; el resto de stats (`MILES DE PARTIDAS`, `GLOBAL RANKING`) quedan como copy fijo, igual que el template, por no tener dato real detrás.

## Plan de implementación

1. **Mover Biblioteca a `/biblioteca`.** Crear `app/biblioteca/page.tsx` con el contenido actual de `app/page.tsx` (sin cambios funcionales). Verificar que `npm run build` siga compilando y que `/biblioteca` muestre el grid igual que antes en `/`.

2. **Estilos Home.** Portar el bloque `.home`, `.home-hero`, `.home-silos`, `.home-section`, `.home-stats`, `.home-final` (y selectores relacionados, ~120 líneas) de `references/resources/home-about/styles.css` a `app/globals.css`. No portar `.about*` de ese mismo archivo.

3. **Componente Home.** Crear `components/Home.tsx` (client component) portando `home.jsx`: `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` y el cuerpo de secciones (hero, why, games preview, stats, actividad en vivo, pricing, CTA final). Usar `next/navigation` (`useRouter`) en vez de la prop `navigate` del template original. Implementar el hook `useReveal` (IntersectionObserver para animaciones `.reveal`) igual que el template.

4. **Datos reales en Home.** Reemplazar los arrays hardcodeados del template (`GAMES.slice(0,6)`, ticker, top jugadores) por los derivados de `lib/data.ts` según lo definido en la sección de modelo de datos.

5. **Ruta `/`.** Reemplazar `app/page.tsx` para que renderice `<Home />` en vez del contenido de Biblioteca (que ya se movió en el paso 1).

6. **Actualizar Nav.** En `components/Nav.tsx`: agregar link "Inicio" → `/` (desktop y mobile), actualizar `isActive` para que "Inicio" resalte solo en `pathname === "/"` y "Biblioteca" resalte en `/biblioteca` y `/game/*` (ya no en `/`).

7. **Repaso de navegación cruzada.** Verificar que todos los CTAs del Home (`EXPLORAR JUEGOS`, `CREAR CUENTA`, `VER TODOS LOS JUEGOS`, `VER SALÓN`, mini-cards, `EMPEZAR GRATIS`, `INSERTAR MONEDA`) naveguen a las rutas correctas (`/biblioteca`, `/login`, `/hall-of-fame`, `/game/[id]`).

8. **Verificación visual.** Levantar `npm run dev`, recorrer `/` (Home) y `/biblioteca`, comparar aspecto contra `home.jsx` / `arcade-vault-standalone.html` de referencia, revisar menú mobile con el nuevo link "Inicio".

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `/` muestra el Home (hero, why, preview de juegos, stats, actividad en vivo, pricing, CTA final) en vez del grid de Biblioteca.
- [ ] `/biblioteca` muestra el grid completo de los 8 juegos con búsqueda por nombre y filtro por categoría funcionando (idéntico al comportamiento previo de `/`).
- [ ] Home: botones "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS" e "INSERTAR MONEDA" navegan a `/biblioteca`.
- [ ] Home: botones "CREAR CUENTA" y "EMPEZAR GRATIS" navegan a `/login`.
- [ ] Home: botón "VER SALÓN" navega a `/hall-of-fame`.
- [ ] Home: clic en una mini-card de la sección "JUEGOS DISPONIBLES AHORA" navega a `/game/[id]` con el id correcto.
- [ ] Home: sección stats muestra `${GAMES.length}+ JUEGOS` (es decir "8+"), no "12+" hardcodeado.
- [ ] Home: ticker de "últimas puntuaciones" y "top jugadores de hoy" muestran datos derivados de `seededScores`/`PLAYERS`/`GAMES` (no los arrays hardcodeados del template original).
- [ ] Home: animaciones `.reveal` se activan al hacer scroll (mismo comportamiento que `useReveal` del template).
- [ ] Nav muestra link "Inicio" (desktop y menú mobile) que navega a `/` y resalta como activo solo en `/`.
- [ ] Nav: link "Biblioteca" resalta como activo en `/biblioteca` y en `/game/*`, ya no en `/`.
- [ ] Aspecto visual del Home (colores neón, tipografía pixel, silhouettes flotantes, efecto CRT) coincide con `home.jsx`/`arcade-vault-standalone.html` de referencia.

## Decisiones tomadas y descartadas

- **Home ocupa `/`, Biblioteca se muda a `/biblioteca`.** Se descarta dejar Home en una ruta secundaria (ej. `/inicio`) porque el template original trata Home como landing real, no como sección extra. Consistente con `nav.jsx` de referencia donde "Inicio" es el primer link.

- **"Acerca de" queda fuera de este spec.** Aunque la carpeta de referencia se llama `home-about` y trae ambos archivos, se decidió separar el trabajo en dos specs para no mezclar la reubicación de rutas (riesgo mayor) con una pantalla nueva independiente (about.jsx + formulario mock). El link "Acerca de" del Nav de referencia no se agrega todavía.

- **Actividad en vivo con datos derivados de `lib/data.ts`, no arrays hardcodeados nuevos.** Se descarta copiar los arrays `NEONFOX`/`PX_KAI`/etc. tal cual del template para evitar una segunda fuente de datos mock paralela a `seededScores`/`PLAYERS`, manteniendo una sola fuente de verdad para datos fake del proyecto.

- **Stat "JUEGOS" dinámico (`GAMES.length`), resto de stats fijo.** Se descarta hardcodear "12+" porque no coincide con el catálogo real de 8 juegos; se mantiene "MILES DE PARTIDAS" y "GLOBAL RANKING" como copy fijo porque no hay dato real detrás de esos contadores en ningún spec.

- **Sin cambios de tipos en `lib/data.ts`.** Se descarta agregar tipos/exports nuevos para ticker o top-jugadores porque las estructuras ya existentes (`ScoreRow`, `Game`) alcanzan; la composición se hace inline en `components/Home.tsx`.

- **CSS: solo se porta el bloque `.home*`, no `.about*`.** Consistente con la decisión de dejar About fuera de scope — portar `.about*` ahora dejaría CSS muerto sin componente que lo use.

## Riesgos identificados

- **Links rotos a `/` durante la migración.** Cualquier lugar que asuma que "/" es Biblioteca (bookmarks, código futuro, otros componentes) se rompe silenciosamente al cambiar el contenido de esa ruta. Mitigación: paso 1 del plan mueve Biblioteca a `/biblioteca` antes de tocar `/`, y el paso 7 repasa navegación cruzada explícitamente.

- **Nav `isActive` mal actualizado.** Si "Biblioteca" sigue marcándose activo en `/` después del cambio, o "Inicio" se marca activo en rutas que no son `/`, la UI confunde al usuario sobre dónde está. Mitigación: criterio de aceptación específico cubre ambos casos.

- **CSS `.home*` puede chocar con utilidades Tailwind ya presentes en `app/globals.css`.** Mismo riesgo que en spec 01 con el CSS general. Mitigación: revisión visual (paso 8) contra la referencia.

- **`seededScores` combinando varios juegos para el ticker puede dar seeds repetidos/previsibles.** Si se usa el mismo seed para varios juegos, el ticker mostraría los mismos scores para distintos juegos. Mitigación: usar un seed derivado del `id` o índice de cada juego (ej. hash simple o índice en `GAMES`) para variar resultados entre filas.
