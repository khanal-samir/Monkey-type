/**
 * E2E / demo fixture flags.
 * Prefer VITE_*-prefixed vars so Vite exposes them to the client bundle.
 *
 * IMPORTANT: access import.meta.env.VITE_* with static property names so Vite
 * can inline them into the client bundle (dynamic env[name] stays undefined).
 */

function processFlag(name: string): string | undefined {
  if (typeof process === 'undefined') return undefined
  return process.env?.[name]
}

export function isE2eFixtures(): boolean {
  return (
    import.meta.env.VITE_E2E_FIXTURES === '1' ||
    processFlag('VITE_E2E_FIXTURES') === '1' ||
    processFlag('E2E') === '1'
  )
}

export function isE2eShortTimer(): boolean {
  return (
    import.meta.env.VITE_E2E_SHORT_TIMER === '1' ||
    processFlag('VITE_E2E_SHORT_TIMER') === '1'
  )
}

/** Wall-clock timer length when VITE_E2E_SHORT_TIMER=1 (production durations unchanged). */
export const E2E_SHORT_TIMER_MS = 2_500
