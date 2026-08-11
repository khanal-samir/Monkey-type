import { useSyncExternalStore } from 'react'
import { useSessionStore } from './store'

/**
 * True after Zustand persist has rehydrated from localStorage (client-only).
 */
export function useSessionHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const unsub = useSessionStore.persist.onFinishHydration(() => {
        onStoreChange()
      })
      // Already hydrated (e.g. after first paint)
      if (useSessionStore.persist.hasHydrated()) {
        onStoreChange()
      }
      return unsub
    },
    () => useSessionStore.persist.hasHydrated(),
    () => false,
  )
}
