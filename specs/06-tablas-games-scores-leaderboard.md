# Spec 06 — Tablas `games` + `scores` y leaderboard real

**Estado:** Approved
**Depende de:** 04-integracion-supabase-fundacion, 05-juego-rocas-asteroids
**Fecha:** 2026-10-04

**Objetivo:** Crear las tablas `games` (sembrada desde el array `GAMES` actual) y `scores` en Supabase con RLS, migrar toda la UI a leer juegos desde la DB y el Hall of Fame a mostrar la mejor marca real por jugador, guardando el puntaje en Supabase al terminar la partida.

## Scope

**Incluye:**

*Base de datos (vía MCP Supabase `apply_migration`):*
- Tabla `games`: `id text primary key` (slug actual), `title text`, `short text`, `long text`, `cat text` (check contra las 4 categorías), `cover text`, `color text`, `plays text`, `created_at timestamptz default now()`. Sin columna `best` (se deriva de `scores`).
- Tabla `scores`: `id uuid primary key default gen_random_uuid()`, `game_id text references games(id)`, `user_id uuid null` (preparado para auth real futura), `name text not null`, `score int not null`, `created_at timestamptz default now()`. Índice en `(game_id, score desc)`.
- RLS en ambas: `SELECT` público (anon) en `games` y `scores`; `INSERT` público (anon) en `scores`; sin `UPDATE`/`DELETE` públicos; `games` solo lectura pública (seed por migración).
- Seed de `games` con los 8 juegos del array `GAMES` actual (sin el campo `best`).

*Tipos y clientes:*
- `lib/database.types.ts` — generado con MCP `generate_typescript_types`.
- `lib/supabase/client.ts` y `server.ts` — tipar con genérico `<Database>`.

*Capa de datos (`lib/`):*
- Helpers de query: `getGames()`, `getGame(id)`, `getTopScores(gameId, limit)` (mejor marca por `name`), `getGlobalTopScores(limit)`, `getTickerScores()` (mejor por juego), `insertScore(...)`. Browser vs server según contexto.
- `lib/data.ts`: conservar tipos (`Game`, `GameCategory`, `ScoreRow`, `CATS`); eliminar `GAMES`, `PLAYERS`, `seededScores`.

*UI:*
- `app/page.tsx` → RSC: fetch games + ticker + top players, pasa por prop a `Home`.
- `components/Home.tsx` → recibe `games`, `ticker`, `topPlayers` por prop; sin `seededScores`.
- `app/biblioteca/page.tsx` → RSC wrapper que hace fetch y pasa `games` a un nuevo `BibliotecaClient` (el código client actual).
- `app/game/[id]/page.tsx` (ya RSC) → fetch `getGame(id)` + `getTopScores(id, 10)`; `notFound()` si no existe.
- `app/game/[id]/play/page.tsx` → `saveScore` inserta en Supabase vía `insertScore`; elimina uso de `localStorage av_scores`.
- `app/hall-of-fame/page.tsx` → tabs desde `games`, filas desde `getTopScores` (mejor por jugador); sin `seededScores`.

**NO incluye:**
- Auth real Supabase (login/signup/OAuth sigue fake en `localStorage av_user`). `user_id` queda null.
- Validación anti-spoof / anti-spam de scores (insert anónimo abierto).
- Paginación del leaderboard (se usa `limit` fijo).
- Realtime / suscripciones a cambios de scores.
- Admin UI para editar la tabla `games`.
- Responsive del canvas u otros cambios visuales no derivados de la migración de datos.
- Migración de scores viejos de `localStorage av_scores` a la DB.

## Modelo de datos

**Tabla `games`:**
```sql
create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan','magenta','green','yellow')),
  plays      text not null default '0',
  created_at timestamptz not null default now()
);
```

**Tabla `scores`:**
```sql
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null references public.games(id) on delete cascade,
  user_id    uuid null references auth.users(id) on delete set null,
  name       text not null,
  score      int  not null check (score >= 0),
  created_at timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);
```

**RLS:**
```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy games_select_public  on public.games  for select using (true);
create policy scores_select_public on public.scores for select using (true);
create policy scores_insert_public on public.scores for insert with check (true);
```
Sin policies de `update`/`delete` → nadie (anon) puede modificar ni borrar. `games` sin `insert` público → solo seed por migración.

**Tipos TS (`lib/data.ts`, conservados):**
```ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export interface Game {
  id: string; title: string; short: string; long: string;
  cat: GameCategory; cover: string;
  color: "cyan" | "magenta" | "green" | "yellow";
  plays: string;          // best eliminado (se deriva)
}
export interface ScoreRow { rank: number; name: string; score: number; date: string }
export const CATS: ("TODOS" | GameCategory)[] = [/* ... */];
```
`best` sale de la UI donde haga falta como `MAX(score)` por juego (o `—` si no hay scores). `ScoreRow.date` se formatea `dd/mm/yyyy` desde `created_at`.

**Query mejor-marca-por-jugador** (`getTopScores`):
```sql
select distinct on (name) name, score, created_at
from scores where game_id = $1
order by name, score desc;
-- luego ordenar por score desc, cortar a limit, asignar rank en JS
```

## Plan de implementación

1. **Migración schema + RLS.** Vía MCP `apply_migration` (`create_tables_games_scores`): crear `games` y `scores`, índice `scores_game_score_idx`, habilitar RLS y crear las 3 policies (select público en ambas, insert público en `scores`). Verificar con `list_tables` + `get_advisors` (security).

2. **Seed de `games`.** Migración `seed_games` con `insert` de los 8 juegos tomados del array `GAMES` actual (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`, `plays`). Sin `best`. Verificar `select count(*) = 8`.

3. **Generar tipos.** MCP `generate_typescript_types` → escribir `lib/database.types.ts`. Añadir genérico `<Database>` a `createBrowserClient`/`createServerClient` en `lib/supabase/client.ts` y `server.ts`.

4. **Capa de datos.** Crear `lib/games.ts` y `lib/scores.ts` (o `lib/queries.ts`) con:
   - `getGames()`, `getGame(id)` — aceptan un client (server o browser) para funcionar en RSC y client.
   - `getTopScores(gameId, limit)` — `distinct on (name)`, ordena por score desc, asigna `rank` + formatea `date`.
   - `getGlobalTopScores(limit)` y `getTickerScores()` — para Home.
   - `insertScore({ gameId, name, score })` — browser client, `user_id: null`.
   En `lib/data.ts` eliminar `GAMES`, `PLAYERS`, `seededScores`; quitar `best` de `Game`. Compilar para detectar todos los imports rotos.

5. **`app/game/[id]/page.tsx` (RSC).** Reemplazar `GAMES.find` por `await getGame(id)` (server client) y `seededScores` por `await getTopScores(id, 10)`. Mantener `notFound()`. Sistema funcional para detalle de juego.

6. **`app/page.tsx` + `Home`.** `app/page.tsx` pasa a RSC async: fetch `getGames()`, `getTickerScores()`, `getGlobalTopScores(5)`; pasa como props a `Home`. `Home` recibe `games`, `ticker`, `topPlayers`; eliminar consts module-level (`TICKER`, `TOP_PLAYERS`) y `seededScores`/`GAMES`. Degradar a vacío/placeholder cuando no haya scores.

7. **`app/biblioteca`.** Extraer el client actual a `components/BibliotecaClient.tsx` (recibe `games: Game[]`). `app/biblioteca/page.tsx` pasa a RSC async que hace `getGames()` y renderiza `<BibliotecaClient games={...} />`. Filtro por `CATS` intacto.

8. **`app/game/[id]/play/page.tsx`.** `saveScore` → `await insertScore({ gameId: game.id, name, score })`; quitar lectura/escritura de `localStorage av_scores`. `game` se resuelve por `getGame` (client) o se pasa desde RSC — resolver sin romper el flujo de pausa/HUD/canvas existente. Nombre sigue precargado de `av_user.name` / `INVITADO`, editable.

9. **`app/hall-of-fame`.** Tabs desde `games` (fetch client o prop). Al cambiar tab, `getTopScores(tab, 12)` → podio + tabla. Eliminar `seededScores`. Bloque "TU MEJOR MARCA" sigue leyendo `av_user` de `localStorage`; si no hay user, se omite. Estado vacío cuando el juego no tiene scores.

10. **Verificación.** `npm run build` verde; `npm run dev`: home/biblioteca/detalle listan los 8 juegos desde DB; jugar `rocas` → game over → "Guardar puntuación" inserta en `scores`; Hall of Fame de `rocas` muestra esa marca; `get_advisors` sin alertas críticas de seguridad.

## Criterios de aceptación

- [x] `npm run build` compila sin errores ni warnings de TypeScript, sin `any`.
- [x] Tablas `games` y `scores` existen en Supabase con el schema, el índice `scores_game_score_idx` y las 3 policies RLS descritas.
- [x] `games` sembrada con exactamente los 8 juegos del array original (`select count(*) = 8`), con `id` slug correcto.
- [x] `lib/database.types.ts` existe y se usa como genérico `<Database>` en los clientes browser y server.
- [x] `lib/data.ts` ya no exporta `GAMES`, `PLAYERS` ni `seededScores`; `grep -rn "seededScores\|GAMES\|PLAYERS" app components` no devuelve referencias.
- [x] Home, biblioteca y detalle de juego listan los 8 juegos leídos desde la DB (no del array).
- [x] Detalle `/game/[id]` con id inexistente devuelve 404 (`notFound`).
- [x] Jugar `rocas` → game over → "Guardar puntuación" inserta una fila en `scores` con `game_id='rocas'`, `name`, `score` correctos y `user_id` null.
- [x] Ninguna escritura ni lectura a `localStorage av_scores` queda en el código.
- [x] Hall of Fame muestra, por juego, la mejor marca por jugador (sin nombres duplicados) ordenada por score desc, formateando la fecha `dd/mm/yyyy` desde `created_at`.
- [x] Un juego sin scores muestra estado vacío (sin crashear, sin mock).
- [x] El score recién guardado en `rocas` aparece en el Hall of Fame de `rocas` tras recargar.
- [x] `get_advisors` (security) no reporta alertas críticas nuevas (RLS habilitado en ambas tablas).

## Decisiones tomadas y descartadas

- **1 spec grande en vez de partir en 06+07.** El alcance toca 4 dominios (schema/RLS/typegen, migración de lectura de `GAMES`, guardado de score, Hall of Fame). Se propuso partir en dos specs; el usuario optó por uno solo con plan por fases. Riesgo asumido: rama y revisión más grandes.

- **`games.id` = slug `text` como PK.** Se descarta uuid + slug unique porque obligaría un lookup slug→uuid en todas las rutas `/game/[id]`; el slug ya es estable y único.

- **`best` derivado, no columna.** Se descarta guardar `best` en `games` porque quedaría desincronizado de los scores reales; se calcula como `MAX(score)` desde `scores`. `plays` sí se mantiene como columna sembrada (dato mock sin fuente real aún).

- **Insert anónimo con `name` libre; `user_id` nullable.** Auth real sigue fake. Se descarta exigir auth Supabase (expandiría mucho el scope). `user_id` queda null y preparado para migración suave cuando llegue el spec de auth.

- **Mejor marca por jugador (`distinct on (name)`) en vez de todas las partidas.** Coincide con el mock actual (nombres únicos en el ranking). Se guardan todas las partidas; el leaderboard agrupa.

- **Cutover total a DB (sin fallback mock ni localStorage espejo).** Se descarta mantener `seededScores` y `av_scores` como respaldo para no tener doble fuente de verdad. Consecuencia aceptada: leaderboards y decoraciones de Home vacíos hasta que haya partidas reales.

- **Wrapper RSC pasando datos por prop en vez de fetch client.** `app/page.tsx` y `biblioteca` pasan a Server Components; evita spinners de carga y da SSR/SEO. El client (`Home`, `BibliotecaClient`) solo recibe props.

- **RLS sin update/delete públicos.** Scores inmutables desde el cliente anónimo; `games` solo lectura. Mitiga borrado/edición maliciosa sin necesitar auth todavía.

## Riesgos identificados

- **Insert anónimo abierto → spam/scores falsos.** RLS permite `INSERT` público sin auth ni validación. Cualquiera puede inyectar scores arbitrarios vía la publishable key. Mitigación: aceptado para esta fase (sin auth); el spec de auth futuro añadirá `user_id` real y endurecerá la policy. No exponer service_role key.

- **Home/leaderboards vacíos tras cutover.** Al eliminar `seededScores`, TICKER, TOP_PLAYERS y los podios quedan sin datos hasta que existan partidas reales (hoy solo `rocas` es jugable). Mitigación: estado vacío/placeholder explícito en paso 6 y 9; criterio de aceptación exige no crashear.

- **`play page` como client necesita `game` desde DB.** Resolver `getGame` en client añade fetch/estado de carga en una ruta que hoy es síncrona. Riesgo de romper el flujo de pausa/HUD/canvas. Mitigación: evaluar en impl convertir `play` en RSC wrapper (como biblioteca) que pase `game` por prop; paso 8 lo deja abierto.

- **`distinct on (name)` vía el client Supabase.** El SDK no expresa `distinct on` directamente; puede requerir un RPC/`view` o traer filas y agrupar en JS. Mitigación: si la query no se expresa con el query builder, crear una `view` o función SQL en la misma migración, o agrupar en el helper.

- **Clientes sin regenerar tipos tras cambios de schema.** Si el schema cambia y no se regenera `database.types.ts`, el tipado miente. Mitigación: paso 3 regenera tipos como parte del flujo; re-ejecutar si la migración cambia.

- **MCP Supabase inestable (visto en spec 04).** `apply_migration`/`generate_typescript_types` podrían dar timeout. Mitigación: reintentar; tener el SQL de las migraciones escrito para aplicar manualmente si el MCP falla.
