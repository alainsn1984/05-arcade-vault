# Spec 04 — Integración Supabase (fundación)

**Estado:** Implementado
**Depende de:** — (fundación independiente)
**Fecha:** 2026-09-29

**Objetivo:** Instalar y configurar `@supabase/ssr` con clientes browser/server y un `proxy.ts` de refresh de sesión, dejando la capa de acceso a Supabase lista sin cablear ninguna feature.

## Scope

**Incluye:**
- Dependencias nuevas en `package.json`: `@supabase/supabase-js` y `@supabase/ssr`.
- `lib/supabase/client.ts` — cliente de navegador con `createBrowserClient` (lee `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
- `lib/supabase/server.ts` — cliente de servidor con `createServerClient` + `await cookies()` de `next/headers`, con `getAll`/`setAll` para cookies (patrón oficial `@supabase/ssr`).
- `lib/supabase/proxy.ts` — helper `updateSession(request)`: crea un server client atado a las cookies del `request`/`response`, llama `supabase.auth.getUser()` para refrescar la sesión, y devuelve **el mismo** objeto response con las cookies seteadas.
- `proxy.ts` (raíz del repo, junto a `app/`) — importa `updateSession`, lo invoca y exporta `config.matcher` que excluye estáticos.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env` (gitignored; el usuario pega la key real), documentadas con placeholder en `.env.template`.
- Actualizar la sección de variables de entorno del `README.md` con las dos nuevas.

**NO incluye (fuera de este spec):**
- Auth real: login/signup/logout, OAuth (Google/GitHub), magic link — siguen falsos en `app/login/page.tsx` (`localStorage`).
- Modo invitado (se decide su futuro en el spec de auth).
- Persistencia de scores: tabla `scores`, guardar puntaje al terminar partida, Hall of Fame leyendo de DB (sigue con `seededScores` mock de `lib/data.ts`).
- Esquema de base de datos, migraciones y políticas RLS.
- Generación de tipos TypeScript de la DB (`lib/database.types.ts`) — se hace en el spec que cree la primera tabla; hasta entonces los clientes van sin genérico `Database`.
- Cualquier cambio de UI o de rutas existentes.

## Modelo de datos

No se crean tablas, tipos ni migraciones en este spec. La fundación solo instancia clientes de Supabase; el esquema y sus tipos llegan en specs posteriores (auth, scores).

## Plan de implementación

1. **Instalar dependencias.** `npm install @supabase/supabase-js @supabase/ssr`.

2. **Cliente browser.** Crear `lib/supabase/client.ts` que exporta una función que devuelve `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)`.

3. **Cliente server.** Crear `lib/supabase/server.ts` (función async) que hace `const cookieStore = await cookies()` y devuelve `createServerClient(url, key, { cookies: { getAll, setAll } })`, con `setAll` envuelto en try/catch (Server Components no pueden escribir cookies; el refresh lo cubre `proxy.ts`).

4. **Helper de proxy.** Crear `lib/supabase/proxy.ts` con `updateSession(request: NextRequest)`: crea `supabaseResponse = NextResponse.next({ request })`, instancia `createServerClient` con `getAll` desde `request.cookies` y `setAll` que escribe tanto en `request.cookies` como en `supabaseResponse.cookies`, llama `await supabase.auth.getUser()`, y retorna `supabaseResponse` sin reconstruirlo.

5. **`proxy.ts` raíz.** Crear `proxy.ts` en la raíz: `export async function proxy(request) { return await updateSession(request) }` y `export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }`.

6. **Env vars.** Agregar a `.env` (valor real de la key lo pega el usuario) y a `.env.template` con placeholder:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://zngwjprgqwcjgvmaxdzx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
   ```

7. **README.** Agregar las dos variables a la sección "Variables de entorno" indicando que son la URL del proyecto y la publishable key (API key nueva `sb_publishable_...`).

8. **Verificación.** `npm run build` verde; `npm run dev` y navegar `/` y `/login` sin errores en consola; confirmar que los estáticos (CSS/imágenes) siguen cargando (matcher del proxy no los intercepta).

## Criterios de aceptación

- [ ] `npm run build` compila sin errores.
- [ ] `@supabase/supabase-js` y `@supabase/ssr` presentes en `package.json`.
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts` y `lib/supabase/proxy.ts` existen, importan y tipan sin `any`.
- [ ] `proxy.ts` raíz ejecuta `updateSession` y devuelve el response con cookies; `config.matcher` excluye `_next/static`, `_next/image`, favicon y assets de imagen.
- [ ] `.env.template` documenta `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] README lista las dos variables nuevas.
- [ ] Comportamiento existente intacto: login sigue con `localStorage`, Hall of Fame sigue con `seededScores`; ninguna ruta cambia de aspecto ni de comportamiento.

## Decisiones tomadas y descartadas

- **`@supabase/ssr` (cookies) en vez de `supabase-js` client-only.** Se descarta client-only (sesión solo en `localStorage`) porque el servidor (RSC, Route Handlers, proxy) no vería al usuario; con cookies la sesión queda disponible en todo el stack y no hay que re-arquitecturar en el spec de auth.

- **Publishable key nueva (`sb_publishable_...`) en vez de la legacy `anon`.** Se usa el naming nuevo de API keys de Supabase (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); la legacy `anon` está en camino de deprecación.

- **`proxy.ts` en vez de `middleware.ts`.** Next 16 renombró `middleware` a `proxy` (`middleware.ts` deprecado, ver `node_modules/next/dist/docs/.../proxy.md`). El cuerpo estándar de `@supabase/ssr` (documentado por Supabase en `middleware.ts`) se porta a `proxy.ts` con la misma lógica.

- **Sin generar tipos de DB todavía.** La DB no tiene tablas; generar tipos ahora daría un schema vacío. Se difiere al spec que cree la primera tabla.

- **Env en `.env` (gitignored) y documentado en `.env.template`.** La publishable key es pública por diseño (`NEXT_PUBLIC_`), pero se mantiene el patrón del proyecto: valores reales en `.env` no versionado, placeholders en `.env.template`.

- **Fundación sin cablear features.** Se descarta incluir auth o scores en este spec para no mezclar la capa de infraestructura con lógica de producto; cada uno tendrá su spec y podrá revisarse/testearse aislado.

## Riesgos identificados

- **Confundir publishable key con la legacy `anon`.** Usar la key equivocada rompe la auth futura. Mitigación: `.env.template` y README nombran explícitamente la publishable key.

- **Helper de proxy que reconstruye el response.** Crear un `NextResponse` nuevo después de setear cookies pierde el refresh de sesión (bug clásico del patrón `@supabase/ssr`). Mitigación: paso 4 exige devolver el mismo `supabaseResponse`.

- **`cookies()` async no await-eado.** En Next 16 `cookies()` de `next/headers` es asíncrono; olvidar el `await` produce error en runtime. Mitigación: cliente server documentado como función async con `await cookies()`.

- **MCP Supabase inestable.** `list_tables`/`get_publishable_keys` dieron timeout durante el diseño. No bloquea la fundación (no requiere acceso remoto); si persiste, afectará specs posteriores que generen tipos o migraciones vía MCP.
