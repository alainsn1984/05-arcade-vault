# Spec 05 — Integración juego Rocas (Asteroids)

**Estado:** Implementado
**Depende de:** 01-mvp-pantallas-visuales
**Fecha:** 2026-09-29

**Objetivo:** Portar `game.js` a TypeScript como componente React canvas y conectarlo a la ruta `/game/rocas/play`, notificando score/lives/nivel al HUD externo de la play page y respetando su pausa y guardado en localStorage.

## Scope

**Incluye:**
- `components/games/AsteroidsGame.tsx` — nuevo componente React que monta
  un `<canvas>` 800×600, arranca el game loop con `requestAnimationFrame`
  en `useEffect`, y lo cancela al desmontar.
- Port completo de `game.js` a TypeScript dentro del componente: clases
  `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, funciones de estado
  y loop. Sin cambios de mecánica.
- Props del componente: `paused: boolean`, `onScoreChange(n)`,
  `onLivesChange(n)`, `onLevelChange(n)`, `onGameOver()`.
- El canvas conserva su `drawHUD()` propio (score, nivel, vidas sobre
  el canvas). Los callbacks notifican a React en paralelo para que el
  HUD externo de la play page también se mantenga sincronizado.
- `app/game/[id]/play/page.tsx` — detectar `id === 'rocas'`: renderizar
  `<AsteroidsGame>` en lugar de la simulación fake (interval + CRT).
- `lives` en la play page pasa de `useState(3)` estático a estado mutable
  actualizado por `onLivesChange`.
- Pausa: cuando `paused === true` el canvas congela el loop (RAF sigue
  corriendo pero `update()` no avanza el estado de juego).
- Game over: la play page llama a `setOver(true)` desde `onGameOver()`;
  el guardado en localStorage (`av_scores`) sigue igual que hoy.

**NO incluye:**
- Controles táctiles / mobile.
- Sonido.
- Persistencia en Supabase (tabla `scores` — spec posterior).
- Cambios de mecánica: sin nuevos enemigos, niveles especiales, etc.
- Otros juegos distintos de `rocas`.
- Cambios visuales en la play page salvo los mínimos para insertar el canvas.

## Modelo de datos

No se crean tablas ni se modifica `lib/data.ts` — `id: "rocas"` ya existe.

**Interfaz del componente:**
```tsx
interface AsteroidsGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: () => void;
}
```

**Clases internas** (privadas al componente, sin exportar):
`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp` — misma estructura
que `game.js`, tipadas con propiedades numéricas y `dead: boolean`.

**localStorage** — sin cambio de esquema. `av_scores` sigue con:
```ts
{ game: string; score: number; name: string; at: number }[]
```

## Plan de implementación

1. **Crear `components/games/AsteroidsGame.tsx`.** Componente client
   (`"use client"`) con un `<canvas ref>` 800×600. Dentro de `useEffect`:
   obtener el contexto 2D, inicializar estado de juego (`initGame()`),
   arrancar el loop con `requestAnimationFrame`. Retornar cleanup que
   cancela el RAF y elimina los event listeners.

2. **Portar clases y lógica a TypeScript.** Copiar y tipar `Bullet`,
   `Asteroid`, `Ship`, `Particle`, `PowerUp` y las funciones utilitarias
   (`wrap`, `dist`, `rand`, `randInt`). Reemplazar las referencias a
   `canvas`/`ctx` globales por las variables locales del `useEffect`.
   Sin cambios de mecánica.

3. **Scoped keyboard listeners.** Mover `window.addEventListener('keydown')`
   y `keyup` al interior del `useEffect`; eliminarlos en el cleanup.
   `keys` y `justPressed` viven como variables locales del closure.

4. **Implementar prop `paused`.** En el loop, si `paused === true` saltar
   la llamada a `update(dt)` (el RAF sigue corriendo para no perder el
   frame reference). Usar `useRef` para acceder al valor actualizado de
   `paused` dentro del closure del loop sin stale closure.

5. **Conectar callbacks.** Llamar `onScoreChange(score)` cuando cambia
   el score, `onLivesChange(lives)` al perder una vida, `onLevelChange(level)`
   al subir nivel, `onGameOver()` al entrar en `state === 'gameover'`.
   Usar `useRef` para los callbacks también (evitar re-arrancar el loop
   en cada render).

6. **Modificar `app/game/[id]/play/page.tsx`.**
   - `lives` pasa a `useState<number>(3)` con setter expuesto.
   - Añadir detección: `const isReal = params.id === 'rocas'`.
   - Si `isReal`: renderizar `<AsteroidsGame paused={paused}
     onScoreChange={setScore} onLivesChange={setLives}
     onLevelChange={setLevel} onGameOver={endGame} />` en lugar del
     div CRT fake; suprimir los `useEffect` de simulación por interval.
   - Si no `isReal`: comportamiento existente sin cambios.
   - El resto de la play page (HUD React, botón pausa, modal game over,
     `saveScore`) queda intacto.

7. **Verificación.** `npm run dev` → `/game/rocas/play`:
   - Juego arranca y el canvas dibuja nave, asteroides y su HUD interno.
   - Score y nivel del HUD React se sincronizan con el canvas.
   - `[P]` pausa y reanuda correctamente.
   - Perder todas las vidas dispara el modal de game over de la play page.
   - "Guardar puntuación" escribe en `av_scores` localStorage con `game: "rocas"` y el score final correcto.
   - Navegar fuera de la ruta no deja loops de RAF ni listeners huérfanos (verificar en DevTools → Performance).
   - Otras rutas (`/game/invasores/play`, etc.) siguen con simulación fake.

## Criterios de aceptación

- [ ] `npm run build` compila sin errores ni warnings de TypeScript.
- [ ] `/game/rocas/play` carga el canvas y el juego arranca inmediatamente.
- [ ] El canvas dibuja nave, asteroides y su HUD interno (score, nivel, vidas).
- [ ] El HUD React de la play page (score, nivel, vidas) se mantiene
      sincronizado con el canvas durante la partida.
- [ ] Teclas `ArrowLeft`/`ArrowRight`/`ArrowUp`/`Space` controlan la nave.
- [ ] Power-up triple disparo aparece y funciona como en `game.js` original.
- [ ] Botón `[P]` congela el juego (canvas no avanza); volver a pulsar
      lo reanuda.
- [ ] Perder las 3 vidas dispara el modal de game over de la play page.
- [ ] "Guardar puntuación" desde el modal escribe el entry en `av_scores`
      localStorage con `game: "rocas"` y el score final correcto.
- [ ] Navegar fuera de la ruta no deja loops de RAF ni listeners huérfanos
      (verificar en DevTools → Performance).
- [ ] `/game/invasores/play` y otras rutas siguen mostrando la simulación
      fake sin cambios.

## Decisiones tomadas y descartadas

- **HUD dual (canvas + React) en vez de solo React.** Se descarta eliminar
  `drawHUD()` del canvas porque el juego ya lo tiene y funciona bien;
  los callbacks a React permiten que el HUD externo de la play page
  también refleje el estado sin duplicar lógica de rendering.

- **Callbacks con `useRef` en vez de dependencias del `useEffect`.** Si los
  callbacks se pasan directo al `useEffect` dependency array, cada render
  de la play page restaría y arrancaría el juego. `useRef` mantiene la
  referencia actualizada sin recrear el loop.

- **`paused` vía `useRef` dentro del loop.** El closure del RAF captura
  el valor inicial de `paused`; leerlo desde un ref garantiza que el loop
  vea el valor actual sin necesidad de reiniciarse.

- **Detección por `id === 'rocas'` en vez de ruta separada.** Se descarta
  crear `/game/rocas/play/page.tsx` propio porque la play page ya tiene
  todo el scaffolding (HUD, modal, saveScore); duplicarlo sería innecesario.

- **Sin cambios de mecánica.** Port 1:1 de `game.js`. Mejoras de gameplay
  (nuevos enemigos, niveles especiales) quedan para un spec posterior.

- **Persistencia en localStorage, no Supabase.** La tabla `scores` no existe
  aún; migrar en el spec que la cree, no aquí.

## Riesgos identificados

- **Stale closure en el loop RAF.** Si `paused` o los callbacks se leen
  desde el closure sin `useRef`, el loop ve valores obsoletos. Mitigación:
  paso 4 y 5 del plan exigen `useRef` para ambos.

- **Event listeners huérfanos.** Si el cleanup del `useEffect` no elimina
  `keydown`/`keyup`, siguen activos tras navegar. Mitigación: criterio de
  aceptación verifica ausencia de listeners en DevTools; cleanup explícito
  en paso 3.

- **Canvas 800×600 fijo en pantallas pequeñas.** No hay responsive en este
  spec. En viewports < 800px el canvas desborda. Mitigación: fuera de scope;
  se acepta el desbordamiento hasta un spec de responsive.

- **`justPressed` con múltiples renders.** El mecanismo consume el flag en
  la primera lectura; si React re-renderiza el componente en medio de un
  frame podría perderse un input. Mitigación: `keys`/`justPressed` viven
  en el closure del `useEffect` (no en estado React), por lo que los
  re-renders no los tocan.
