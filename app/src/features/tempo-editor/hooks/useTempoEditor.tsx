import { SongTempoEditor, TempoEditor } from "@signal-app/core"
import { atom, useAtomValue, useSetAtom, useStore } from "jotai"
import { Store } from "jotai/vanilla/store"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react"
import { BeatsProvider, createBeatsScope } from "../../../hooks/useBeats"
import {
  createQuantizerScope,
  QuantizerProvider,
} from "../../../hooks/useQuantizer"
import { useStores } from "../../../hooks/useStores"
import {
  createTickScrollScope,
  TickScrollProvider,
  useTickScroll,
} from "../../../hooks/useTickScroll"
import { TempoSelection } from "../entities/TempoSelection"

type TempoEditorStore = {
  quantizerScope: Store
  tickScrollScope: Store
  beatsScope: Store
}

// biome-ignore lint/style/noNonNullAssertion: we assume the provider is always used
const TempoEditorStoreContext = createContext<TempoEditorStore>(null!)
// biome-ignore lint/style/noNonNullAssertion: we assume the provider is always used
const TempoEditorContext = createContext<TempoEditor>(null!)

export function TempoEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const store = useStore()
  const { songStore } = useStores()
  const song = useSyncExternalStore(
    songStore.onSongChanged.subscribe,
    useCallback(() => songStore.song, [songStore]),
  )

  const tempoEditorStore = useMemo(() => {
    // should match the order in TempoEditorScope
    const tickScrollScope = createTickScrollScope(store)
    const quantizerScope = createQuantizerScope(tickScrollScope)
    const beatsScope = createBeatsScope(quantizerScope)
    return {
      tickScrollScope,
      quantizerScope,
      beatsScope,
    }
  }, [store])

  const tempoEditor = useMemo(() => new SongTempoEditor(song), [song])

  return (
    <TempoEditorContext.Provider value={tempoEditor}>
      <TempoEditorStoreContext.Provider value={tempoEditorStore}>
        {children}
      </TempoEditorStoreContext.Provider>
    </TempoEditorContext.Provider>
  )
}

export function TempoEditorScope({ children }: { children: React.ReactNode }) {
  const { tickScrollScope, quantizerScope, beatsScope } = useContext(
    TempoEditorStoreContext,
  )

  return (
    <TickScrollProvider scope={tickScrollScope} minScaleX={0.15} maxScaleX={15}>
      <QuantizerProvider scope={quantizerScope} quantize={4}>
        <BeatsProvider scope={beatsScope}>{children}</BeatsProvider>
      </QuantizerProvider>
    </TickScrollProvider>
  )
}

export function useTempoTickScroll() {
  const { tickScrollScope } = useContext(TempoEditorStoreContext)
  return useTickScroll(tickScrollScope)
}

export function useTempoEditorService() {
  return useContext(TempoEditorContext)
}

export function useTempoEditor() {
  return {
    get selection() {
      return useAtomValue(selectionAtom)
    },
    get selectedEventIds() {
      return useAtomValue(selectedEventIdsAtom)
    },
    get mouseMode() {
      return useAtomValue(mouseModeAtom)
    },
    setSelection: useSetAtom(selectionAtom),
    setSelectedEventIds: useSetAtom(selectedEventIdsAtom),
    setMouseMode: useSetAtom(mouseModeAtom),
    resetSelection: useSetAtom(resetSelectionAtom),
  }
}

// atoms
const mouseModeAtom = atom<"pencil" | "selection">("pencil")
const selectionAtom = atom<TempoSelection | null>(null)
const selectedEventIdsAtom = atom<readonly number[]>([])

// actions
const resetSelectionAtom = atom(null, (_get, set) => {
  set(selectionAtom, null)
  set(selectedEventIdsAtom, [])
})
