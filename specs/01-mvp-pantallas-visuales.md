# Spec 01 — Arcade Vault MVP visual

**Estado:** Implementado
**Depende de:** ninguno (primer spec del proyecto)
**Fecha:** 2026-07-11

**Objetivo:** Implementar las 5 pantallas de Arcade Vault (biblioteca, detalle de juego, reproductor simulado, login y salón de la fama) como rutas reales de Next.js App Router, con estilos y datos mock portados de `references/resources/templates/`, sin lógica de juego real.

## Scope

**Incluye:**
- Layout raíz (`app/layout.tsx`) con Nav (header) + footer compartidos, portados de `nav.jsx`/`app.jsx`.
- Ruta `/` — Biblioteca: grid de juegos, búsqueda por nombre, filtro por categoría (chips), portado de `biblioteca.jsx`.
- Ruta `/game/[id]` — Detalle: info del juego, tags, stats, leaderboard (scores seedeados fake), botón "jugar", portado de `detalle.jsx`.
- Ruta `/game/[id]/play` — Reproductor: HUD (score/vidas/nivel), simulación visual fake (score sube solo, cambia de nivel), pantalla CRT decorativa, pausa, modal de fin de juego con guardado de puntuación, portado de `reproductor.jsx`.
- Ruta `/login` — Auth: tabs iniciar sesión / crear cuenta, mock funcional (acepta cualquier dato, guarda sesión fake en `localStorage`), botón invitado, portado de `auth.jsx`.
- Ruta `/hall-of-fame` — Salón de la Fama: tabs por juego, podio top 3, tabla de ranking, fila "tu mejor marca" si hay sesión, portado de `salon.jsx`.
- Datos mock: `GAMES`, `CATS`, `PLAYERS`, `seededScores` portados de `data.jsx` a `lib/data.ts` (TypeScript).
- Estilos: `styles.css` portado casi tal cual a `app/globals.css` (variables neón/CRT/pixel-font, clases existentes).
- Persistencia real en `localStorage`: sesión de usuario (`av_user`) y puntuaciones guardadas (`av_scores`) — mismo mecanismo que el template.

**NO incluye (fuera de este spec):**
- Lógica de juego real para ninguno de los 8 juegos del catálogo (Bloque Buster, Caída, Serpentina, Glotón, Invasores, Rocas, Ranaria, Duelo Pixel) — el Reproductor es 100% decorativo/simulado.
- Backend/API real, base de datos, autenticación real (OAuth de Google/GitHub son botones decorativos sin funcionalidad).
- Sistema de créditos real (el contador "CRÉDITOS · 03" es estático).
- Salón de la Fama con datos reales combinados con `av_scores` guardados — el ranking sigue siendo el generador seedeado fake, no se mezcla con partidas guardadas por el usuario.
- Responsive/mobile-specific QA más allá de lo que ya trae el template (menú hamburguesa se porta tal cual, sin rediseño adicional).
- Tests automatizados (no hay test runner configurado en el proyecto).

## Modelo de datos

Todo vive en `lib/data.ts` (portado de `data.jsx`), sin cambios de forma, solo tipado:

```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;      // clase CSS del fondo (cover-bricks, cover-tetro, ...)
  color: "cyan" | "magenta" | "green" | "yellow";
  best: number;
  plays: string;       // ej. "12.4K"
}

export const GAMES: Game[];
export const CATS: ("TODOS" | GameCategory)[];
export const PLAYERS: string[];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/yyyy
}

export function seededScores(seed: number, count?: number): ScoreRow[];
```

Persistencia en `localStorage` (sin tipos nuevos en `lib/data.ts`, se maneja inline donde se usa):

- `av_user` → `{ name: string } | null`
- `av_scores` → `Array<{ game: string; score: number; name: string; at: number }>`

## Plan de implementación

1. **Estilos base.** Portar `references/resources/templates/styles.css` a `app/globals.css` (fusionando con lo mínimo indispensable de Tailwind v4 ya generado por create-next-app). Verificar que la app siga buildeando.

2. **Datos mock.** Crear `lib/data.ts` con `Game`, `GameCategory`, `ScoreRow`, `GAMES`, `CATS`, `PLAYERS`, `seededScores` (tipados, sin `window.X = ...`, exportados como módulo ES).

3. **Layout raíz + Nav.** Crear `components/Nav.tsx` (portado de `nav.jsx`, adaptado a `next/link` y `next/navigation` en vez de router hash-custom; lee sesión de `localStorage` vía `useEffect`/client component). Integrar Nav + footer en `app/layout.tsx`.

4. **Ruta `/` (Biblioteca).** Crear `app/page.tsx` con `GameCard` + `Library` portados de `biblioteca.jsx`, usando `lib/data.ts` y navegación con `next/link` hacia `/game/[id]`.

5. **Ruta `/game/[id]` (Detalle).** Crear `app/game/[id]/page.tsx` portado de `detalle.jsx`, resolviendo `game` por `id` desde `GAMES` y `scores` vía `seededScores`. `notFound()` si el id no existe.

6. **Ruta `/game/[id]/play` (Reproductor).** Crear `app/game/[id]/play/page.tsx` portado de `reproductor.jsx` (client component): HUD, simulación de score con `setInterval`, pausa, modal de fin con guardado en `localStorage` (`av_scores`), lee sesión de `localStorage` para nombre default.

7. **Ruta `/login` (Auth).** Crear `app/login/page.tsx` portado de `auth.jsx` (client component): tabs, formulario mock, guarda `av_user` en `localStorage`, redirige a `/` con `useRouter().push`.

8. **Ruta `/hall-of-fame` (Salón).** Crear `app/hall-of-fame/page.tsx` portado de `salon.jsx`: tabs por juego, podio, tabla, fila "tu mejor marca" si hay `av_user` en `localStorage`.

9. **Repaso de navegación cruzada.** Verificar que todos los enlaces/botones entre pantallas (Nav, cards, detalle→reproductor, fin de juego→volver, salón→biblioteca) apunten a las rutas reales creadas en los pasos 4–8.

10. **Verificación visual.** Levantar `npm run dev`, recorrer las 5 pantallas en navegador (desktop + menú mobile), comparar contra `Arcade Vault.html` de referencia.

## Criterios de aceptación

- [x] `npm run build` compila sin errores.
- [x] `/` muestra el grid de los 8 juegos de `GAMES`, con búsqueda por nombre y filtro por categoría (chips) funcionando.
- [x] Clic en una card o botón "JUGAR" en `/` navega a `/game/[id]` con el id correcto.
- [x] `/game/[id]` muestra info del juego, tags, stats y leaderboard (10 filas) generado por `seededScores`.
- [x] `/game/[id]` con un id inexistente devuelve 404 (`notFound()`).
- [x] Botón "JUGAR AHORA" en `/game/[id]` navega a `/game/[id]/play`.
- [x] `/game/[id]/play` muestra HUD con score que sube solo cada ~220ms, nivel que sube cada 2500 puntos, botón PAUSA detiene el incremento.
- [x] Botón "FIN" en `/game/[id]/play` abre modal con puntuación final y campo de nombre.
- [x] Guardar puntuación en el modal persiste un registro en `localStorage` bajo `av_scores` (`game`, `score`, `name`, `at`).
- [x] `/login` permite loguearse con cualquier usuario/contraseña, guarda `{ name }` en `localStorage` bajo `av_user` y redirige a `/`.
- [x] `/login` permite entrar como invitado (sin guardar `av_user`) y redirige a `/`.
- [x] Nav muestra "Iniciar Sesión" sin sesión, y nombre de usuario + opción de cerrar sesión con sesión activa; cerrar sesión borra `av_user` de `localStorage`.
- [x] `/hall-of-fame` muestra tabs por los 8 juegos, podio top 3 y tabla de ranking (12 filas) por juego seleccionado.
- [x] `/hall-of-fame` muestra fila "tu mejor marca" solo si hay sesión activa (`av_user` presente).
- [x] Menú hamburguesa mobile del Nav abre/cierra y sus links navegan a las mismas rutas que el menú desktop.
- [x] El aspecto visual (colores neón, tipografía pixel, efecto CRT) coincide con `Arcade Vault.html` de referencia en las 5 pantallas.

## Decisiones tomadas y descartadas

- **Rutas reales de App Router en vez de router hash-custom.** El template original usa un solo `App` con `useState` + `location.hash` como router SPA. Se descarta para usar rutas reales de Next.js (`/`, `/game/[id]`, `/game/[id]/play`, `/login`, `/hall-of-fame`), consistente con el resto del proyecto (App Router) y con mejor SEO/navegación nativa (back/forward, deep links).

- **Rutas en inglés, copy en español.** Se decidió `/game/[id]`, `/login`, `/hall-of-fame` en vez de `/juego/[id]`, `/auth`, `/salon` — convención técnica en inglés aunque toda la UI visible siga en español.

- **Reproductor con simulación visual fake, no estático.** Se mantiene el comportamiento del template (score sube solo, sube de nivel, pausa funcional) porque es puramente decorativo — no constituye "implementar un juego", solo anima el HUD. Se descartó la opción 100% estática por alejarse innecesariamente del template ya validado.

- **Auth mock funcional, no solo UI.** Se mantiene el login falso (acepta cualquier dato, persiste `av_user` en `localStorage`) igual que el template, para que Nav y "tu mejor marca" en Salón tengan una fuente de sesión real con la que interactuar. Se descartó dejarlo solo visual porque rompería esas dependencias.

- **Guardado de puntuaciones persiste en `localStorage` pero no alimenta el Salón de la Fama.** Se decidió que `av_scores` se guarda igual que en el template pero el ranking del Salón sigue usando `seededScores` (datos fake). Mezclarlos es una feature de "puntuaciones reales" que queda fuera de este MVP visual.

- **Créditos del Nav hardcodeados.** Se descarta cualquier lógica de descuento de créditos — no hay sistema de créditos en este MVP, es puramente decorativo como en el template.

- **CSS portado casi tal cual, no reescrito en Tailwind.** Se prioriza fidelidad visual exacta al template (950 líneas de CSS con variables neón/CRT/pixel-font ya afinadas) sobre "pureza" de usar Tailwind para todo. Tailwind queda disponible para código nuevo futuro, no se fuerza su uso retroactivo.

- **Layout/Nav/footer compartidos en `app/layout.tsx`.** Se descarta repetir Nav/footer en cada `page.tsx` — Next.js App Router está diseñado para layouts compartidos y evita duplicación.

## Riesgos identificados

- **`localStorage` en Server Components.** Next.js App Router renderiza en servidor por default; `localStorage`/`window` no existen ahí. Mitigación: componentes que leen/escriben sesión o scores (Nav, Auth, Reproductor, Salón) deben ser Client Components (`"use client"`).

- **Hidratación con datos de `localStorage`.** Leer `av_user` en el primer render del cliente puede generar mismatch servidor/cliente (SSR no sabe si hay sesión). Mitigación: inicializar estado en `useEffect` (post-mount), no en el render inicial, igual que hace el template con `useState(() => ...)` pero cuidando el flash inicial sin sesión.

- **`seededScores` no determinístico entre server/cliente si se llama en ambos lados.** Si el leaderboard se calculara en Server Component con un seed distinto en cada request, no habría problema real (es fake), pero si se mezclara con render de cliente podría verse un "salto" de valores. Mitigación: calcular `seededScores` en un único lugar por página (idealmente Server Component, dato estático por `id`).

- **Fidelidad visual del CSS portado.** 950 líneas de CSS con variables/animaciones custom (CRT, pixel-font, neón) pueden chocar con el reset/utilidades de Tailwind v4 ya presentes en `globals.css`. Mitigación: revisar visualmente cada pantalla contra `Arcade Vault.html` tras el port (paso 10 del plan).

- **Nombres de rutas dinámicas.** `/game/[id]` y `/game/[id]/play` dependen de que `id` coincida exactamente con los ids de `GAMES` (`bloque-buster`, `caida`, etc.) — un id mal tipeado en un `Link href` rompe silenciosamente la navegación. Mitigación: usar el objeto `game.id` desde `lib/data.ts`, nunca strings sueltos, y `notFound()` como red de seguridad en `/game/[id]`.
