import {
  Metadata,
  SoundFontFile,
  SoundFontItem,
  SoundFontRepository,
} from "@signal-app/core"
import { makeObservable, observable } from "mobx"
import { makePersistable } from "mobx-persist-store"
import { basename } from "../helpers/path"
import { isRunningInElectron } from "../helpers/platform"

export class SoundFontStore {
  files: readonly SoundFontFile[] = []
  selectedSoundFontId: number | null = null
  scanPaths: readonly string[] = []

  constructor(private readonly repository: SoundFontRepository) {
    makeObservable(this, {
      files: observable.shallow,
      selectedSoundFontId: observable,
      scanPaths: observable.shallow,
    })
  }

  async init() {
    await makePersistable(this, {
      name: "SoundFontStore",
      properties: ["selectedSoundFontId", "scanPaths"],
      storage: window.localStorage,
    })

    await this.repository.init()
    await this.updateFileList()
  }

  private async updateFileList() {
    this.files = await this.repository.list()
  }

  addSoundFont = async (item: SoundFontItem, metadata: Metadata) => {
    await this.repository.save(item, metadata)
    await this.updateFileList()
  }

  removeSoundFont = async (id: number) => {
    await this.repository.remove(id)
    await this.updateFileList()
  }

  scanSoundFonts = async () => {
    if (!isRunningInElectron()) {
      return
    }

    await this.repository.removeScanned(this.scanPaths)

    const items: { data: SoundFontItem; metadata: Metadata }[] = []

    for (const scanPath of this.scanPaths) {
      const files = await window.electronAPI.searchSoundFonts(scanPath)

      const newItems = files.map((file) => ({
        data: <SoundFontItem>{ type: "file", path: file },
        metadata: <Metadata>{ name: basename(file), scanPath },
      }))

      items.push(...newItems)
    }

    await this.repository.saveMany(items)
    await this.updateFileList()
  }

  removeScanPath = async (path: string) => {
    await this.repository.removeScanned(this.scanPaths)
    this.scanPaths = this.scanPaths.filter((p) => p !== path)
    this.scanSoundFonts()
  }

  addScanPath = async (path: string) => {
    if (this.scanPaths.includes(path)) {
      return
    }
    this.scanPaths = [...this.scanPaths, path]
    await this.scanSoundFonts()
  }
}
