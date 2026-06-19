# MIDI Device Feature

## Purpose

Manages MIDI input/output device integration in the UI.

## Responsibilities

- Enumerate MIDI devices.
- Handle device selection and availability.
- Reflect routing and connection status.

## Representative Components and Hooks

- `MIDIDeviceView`: user-facing device management UI.
- `useMIDIDevice`: Web MIDI device discovery, enable/disable toggles, and routing controls.
- `MIDIDeviceProvider`: synchronization layer for enabled outputs -> synth output group.
- `useBLEMIDIDevice`: Bluetooth MIDI scanning and registration via BLE.

## Architecture Notes

- Uses `useSyncExternalStore` to consume store-backed observables from `midiDeviceStore` and `bluetoothMIDIDeviceStore`.
- Bridges device enable state to runtime outputs (`synthGroup.outputs`) including factory synth and external MIDI outputs.
- Handles permission/bootstrap flow with `navigator.requestMIDIAccess` and keeps UI status in local atoms (`isLoading`, `requestError`).

## Libraries and External Factors

- Browser Web MIDI API support is required for standard MIDI I/O.
- BLE MIDI support depends on `web-ble-midi` and browser/device Bluetooth capability.
- OS/browser permission dialogs and device hot-plug events directly affect runtime behavior.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
