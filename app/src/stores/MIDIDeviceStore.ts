import { action, makeObservable, observable } from "mobx"
import { makePersistable } from "mobx-persist-store"

export class MIDIDeviceStore {
  enabledOutputs: { [deviceId: string]: boolean } = {}
  enabledInputs: { [deviceId: string]: boolean } = {}
  isFactorySoundEnabled = true
  midiInputRouting: "selectedTrack" | "channelRouting" = "selectedTrack"

  constructor() {
    makeObservable(this, {
      enabledOutputs: observable,
      enabledInputs: observable,
      isFactorySoundEnabled: observable,
      midiInputRouting: observable,
      setInputEnable: action,
      setOutputEnable: action,
      setMidiInputRouting: action,
    })

    makePersistable(this, {
      name: "MIDIDeviceStore",
      properties: [
        "isFactorySoundEnabled",
        "enabledOutputs",
        "enabledInputs",
        "midiInputRouting",
      ],
      storage: window.localStorage,
    })
  }

  setInputEnable = (deviceId: string, enabled: boolean) => {
    this.enabledInputs = {
      ...this.enabledInputs,
      [deviceId]: enabled,
    }
  }

  setOutputEnable = (deviceId: string, enabled: boolean) => {
    this.enabledOutputs = {
      ...this.enabledOutputs,
      [deviceId]: enabled,
    }
  }

  setMidiInputRouting = (routing: "selectedTrack" | "channelRouting") => {
    this.midiInputRouting = routing
  }
}
