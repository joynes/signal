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

  return {
    inputDevices,
    isBluetoothSupported: BLEMIDI.isSupported(),
    get isLoading() {
      return useMobxGetter(bluetoothMIDIDeviceStore, "isLoading")
    },
    get requestError() {
      return useMobxGetter(bluetoothMIDIDeviceStore, "requestError")
    },
    requestBluetoothMIDIDevice: useCallback(() => {
      bluetoothMIDIDeviceStore.requestDevice()
    }, [bluetoothMIDIDeviceStore]),
    setInputEnable: useCallback(
      (deviceId: string, isEnabled: boolean) => {
        bluetoothMIDIDeviceStore.setInputEnable(deviceId, isEnabled)
      },
      [bluetoothMIDIDeviceStore],
    ),
  }
}
