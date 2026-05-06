import { defaultSoundFontId, SoundFontItem } from "@signal-app/core"
import { SoundFont } from "@signal-app/player"
import { atom, useAtomValue } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"
import { soundFontRepository } from "../services/repositories"
import { useMobxGetter } from "./useMobxSelector"
import { useStores } from "./useStores"

export function useSoundFont() {
  const { soundFontStore, synth } = useStores()

  const _loadSoundFont = useAtomCallback(
    useCallback(
      async (_get, set, id: number) => {
        try {
          set(isLoadingAtom, true)
          const soundFontItem = await soundFontRepository.getItem(id)
          if (soundFontItem === null) {
            throw new Error("SoundFont not found")
          }
          const soundFont = await loadSoundFont(soundFontItem)
          await synth.loadSoundFont(soundFont)
          soundFontStore.selectedSoundFontId = id
        } catch (e) {
          console.error(e)
          alert(`Failed to load SoundFont: ${(e as Error).message}`)
        } finally {
          set(isLoadingAtom, false)
        }
      },
      [soundFontStore, synth],
    ),
  )

  return {
    get files() {
      return useMobxGetter(soundFontStore, "files")
    },
    get selectedSoundFontId() {
      return useMobxGetter(soundFontStore, "selectedSoundFontId")
    },
    get scanPaths() {
      return useMobxGetter(soundFontStore, "scanPaths")
    },
    get isLoading() {
      return useAtomValue(isLoadingAtom)
    },
    loadSelectedSoundFont: useCallback(async () => {
      const soundFontId =
        soundFontStore.selectedSoundFontId ?? defaultSoundFontId
      await _loadSoundFont(soundFontId)
    }, [_loadSoundFont, soundFontStore]),
    load: _loadSoundFont,
    addSoundFont: soundFontStore.addSoundFont,
    removeSoundFont: soundFontStore.removeSoundFont,
    scanSoundFonts: soundFontStore.scanSoundFonts,
    removeScanPath: soundFontStore.removeScanPath,
    addScanPath: soundFontStore.addScanPath,
  }
}

async function loadSoundFont(soundfont: SoundFontItem) {
  switch (soundfont.type) {
    case "local":
      return SoundFont.load(soundfont.data)
    case "remote":
      return await SoundFont.loadFromURL(soundfont.url)
    case "file": {
      const data = await window.electronAPI.readFile(soundfont.path)
      return await SoundFont.load(data)
    }
  }
}

// atoms
const isLoadingAtom = atom(false)
