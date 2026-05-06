import { action, makeObservable, observable } from "mobx"
import { makePersistable } from "mobx-persist-store"
import { MIDIInput } from "../services/MIDIInput"

export class MIDIDeviceStore {
  enabledOutputs: { [deviceId: string]: boolean } = {}
  enabledInputs: { [deviceId: string]: boolean } = {}
  isFactorySoundEnabled = true
  midiInputRouting: "selectedTrack" | "channelRouting" = "selectedTrack"

  constructor(private readonly midiInput: MIDIInput) {
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

  requestMIDIAccess = async (
    onStateChange: (midiAccess: WebMidi.MIDIAccess) => void,
  ) => {
    if (navigator.requestMIDIAccess === undefined) {
      throw new Error("Web MIDI API is not supported by your browser")
    }

    const midiAccess = (await navigator.requestMIDIAccess({
      sysex: true,
    })) as WebMidi.MIDIAccess

    midiAccess.onstatechange = () => {
      onStateChange(midiAccess)
    }
    for (const input of midiAccess.inputs.values()) {
      input.onmidimessage = (event) => {
        if (this.enabledInputs[input.id]) {
          this.midiInput.onMidiMessage(event)
        }
      }
    }
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
