import { z } from 'zod';

/**
 * Fail-fast environment validation. `import { env } from '@/lib/env'` instead of reading
 * `process.env` anywhere, and a missing or malformed variable stops the process AT STARTUP with the
 * full list of what is wrong — rather than surfacing later as an `undefined` in a URL, a connection
 * string of `"undefined"`, or a 500 the first time one route is visited.
 *
 * Measured on this platform 2026-07-30: zero of ten repos validated their environment, while every
 * one of them depended on at least one required variable. The platform's secret discipline covers
 * WHERE a value is stored (.env, chmod 600, gitignored) and says nothing about whether it is present.
 *
 * This is the t3-env pattern (build-time validation, server/client separation, a typed accessor)
 * written against plain zod, which every app here already depends on. If an app later wants the
 * package, `@t3-oss/env-nextjs` is the drop-in upgrade and this file is the thing it replaces.
 *
 * Three details that are not optional, each of which is a real failure this shape prevents:
 *
 *  1. `SKIP_ENV_VALIDATION=1` — `docker build` runs `npm run build` with NO .env, so validation at
 *     import time would fail the image build. The platform Dockerfile must set it for the build stage.
 *     It is an escape for BUILD, never for runtime.
 *  2. A `NEXT_PUBLIC_*` variable has to be listed LITERALLY in `clientRuntime` below. Next inlines
 *     those at build time by textual substitution, so `process.env[key]` with a computed key is
 *     `undefined` in the browser bundle even when the variable is set. The `satisfies` clause turns
 *     forgetting that into a COMPILE error instead of a production one.
 *  3. Server-only keys are unreachable from client code — reading one throws instead of quietly
 *     evaluating to `undefined` and shipping a broken bundle.
 */

// ---------------------------------------------------------------------------------------------
// Declare the variables. Everything below this block is generic and does not change per app.
// ---------------------------------------------------------------------------------------------

/** Server-only. Never reaches the browser bundle. */
const serverShape = {
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Add this app's variables here. Worked examples of the three common shapes:
  //   DATABASE_URL:   z.string().min(1),                       // required, no default
  //   DISCORD_TOKEN:  z.string().min(1),
  //   PORT:           z.coerce.number().int().positive().default(3000),   // coerce: env is strings
  //   TZ:             z.string().default('Asia/Ho_Chi_Minh'),
};

/** Exposed to the browser. Must be prefixed `NEXT_PUBLIC_`, and public by definition — never a secret. */
const clientShape = {
  // NEXT_PUBLIC_APP_URL: z.string().url(),
};

/**
 * The runtime values for `clientShape`, written out one literal `process.env.X` at a time — see (2)
 * above. `satisfies` is what makes an unlisted key fail to compile.
 */
const clientRuntime = {
  // NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} satisfies Record<keyof typeof clientShape, unknown>;

// ---------------------------------------------------------------------------------------------
// Generic below.
// ---------------------------------------------------------------------------------------------

const isServer = typeof window === 'undefined';
const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

type Env = z.infer<z.ZodObject<typeof serverShape & typeof clientShape>>;

function validate(): Env {
  // The build stage has no .env; the cast is the deliberate cost of that escape hatch.
  if (skipValidation) return { ...process.env, ...clientRuntime } as unknown as Env;

  // On the client only the public half exists, and only via the literals in clientRuntime.
  const shape = isServer ? { ...serverShape, ...clientShape } : clientShape;
  const source = isServer ? { ...process.env, ...clientRuntime } : clientRuntime;

  const parsed = z.object(shape).safeParse(source);
  if (parsed.success) return parsed.data as Env;

  // One message listing EVERY problem: a per-variable throw makes fixing a fresh .env an N-run loop.
  const problems = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Invalid environment variables:\n${problems}\n\n` +
      `Set them in .env (chmod 600, gitignored). For a build with no .env, set SKIP_ENV_VALIDATION=1 ` +
      `— for the BUILD only, never at runtime.`,
  );
}

const validated = validate();

const serverOnlyKeys = new Set(Object.keys(serverShape));

/** The only sanctioned way to read configuration. Typed, validated, and safe to import anywhere. */
export const env = new Proxy(validated, {
  get(target, key: string) {
    if (!isServer && serverOnlyKeys.has(key) && !key.startsWith('NEXT_PUBLIC_')) {
      throw new Error(
        `env.${key} is server-only and was read from client code. Move the read into a server ` +
          `component / server action / route handler, or expose a NEXT_PUBLIC_ variable if the value ` +
          `is genuinely public.`,
      );
    }
    return target[key as keyof Env];
  },
}) as Readonly<Env>;
