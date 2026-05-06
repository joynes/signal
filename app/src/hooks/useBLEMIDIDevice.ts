import { atom, useAtomValue } from "jotai"
import { useAtomCallback } from "jotai/utils"
import { useCallback } from "react"
import { BLEMIDI } from "web-ble-midi"
import { Device } from "./useMIDIDevice"
import { useMobxGetter } from "./useMobxSelector"
import { useStores } from "./useStores"

export function useBLEMIDIDevice() {
  const { bluetoothMIDIDeviceStore } = useStores()

  const btInputs = useMobxGetter(bluetoothMIDIDeviceStore, "inputs")
  const btEnabledInputs = useMobxGetter(
    bluetoothMIDIDeviceStore,
    "enabledInputs",
  )
  const inputDevices: Device[] = btInputs.map((d) => ({
    id: d.id,
    name: d.name ?? "Bluetooth MIDI Device",
    isConnected: btInputs.some((i) => i.id === d.id),
    isEnabled: btEnabledInputs[d.id],
    isBluetooth: true,
  }))

  const requestBluetoothMIDIDevice = useAtomCallback(
    useCallback(
      async (_get, set) => {
        set(isLoadingAtom, true)
        set(requestErrorAtom, null)
        try {
          const device = await BLEMIDI.scan()
          bluetoothMIDIDeviceStore.registerDevice(device)
          await bluetoothMIDIDeviceStore.setInputEnable(device.id, true)
        } catch (e) {
          set(requestErrorAtom, e as Error)
        } finally {
          set(isLoadingAtom, false)
        }
      },
      [bluetoothMIDIDeviceStore],
    ),
  )

  return {
    inputDevices,
    isBluetoothSupported: BLEMIDI.isSupported(),
    get isLoading() {
      return useAtomValue(isLoadingAtom)
    },
    get requestError() {
      return useAtomValue(requestErrorAtom)
    },
    requestBluetoothMIDIDevice,
    setInputEnable: useCallback(
      (deviceId: string, isEnabled: boolean) => {
        bluetoothMIDIDeviceStore.setInputEnable(deviceId, isEnabled)
      },
      [bluetoothMIDIDeviceStore],
    ),
  }
}

// atoms
const isLoadingAtom = atom(false)
const requestErrorAtom = atom<Error | null>(null)
