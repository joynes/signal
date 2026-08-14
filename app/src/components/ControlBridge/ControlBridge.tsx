import {
  emptySong,
  emptyTrack,
  isNoteEvent,
  isSetTempoEvent,
  NoteEvent,
  programChangeMidiEvent,
  songFromMidi,
  songToMidi,
  TrackId,
  TrackEventOf,
} from "@signal-app/core"
import { renderAudio } from "@signal-app/player"
import { TimeSignatureEvent } from "midifile-ts"
import { useCallback, useEffect, useRef } from "react"
import { useSetSong } from "../../actions/song"
import { encodeMp3, encodeWAV } from "../../helpers/encodeAudio"
import { useHistory } from "../../hooks/useHistory"
import { usePianoRoll } from "../../hooks/usePianoRoll"
import { useStores } from "../../hooks/useStores"
import { useTrackMute } from "../../hooks/useTrackMute"
import { TrackMute } from "../../trackMute/TrackMute"

type ControlCommand = {
  id: string
  operation: string
  arguments?: Record<string, unknown>
}

const TOKEN_KEY = "signal-control-token"

const fromBase64 = (value: string) => {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const toBase64 = (value: Uint8Array) => {
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    binary += String.fromCharCode(...value.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

const asNumber = (value: unknown, name: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`)
  }
  return value
}

const asInteger = (value: unknown, name: string) =>
  Math.floor(asNumber(value, name))

const asString = (value: unknown, name: string) => {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string`)
  }
  return value
}

const tickAtSeconds = (song: ReturnType<typeof emptySong>, seconds: number) => {
  const tempoEvents = (song.conductorTrack?.events ?? [])
    .filter(isSetTempoEvent)
    .slice()
    .sort((a, b) => a.tick - b.tick)
  let elapsedSeconds = 0
  let currentTick = 0
  let currentBpm = 120

  for (const event of tempoEvents) {
    const segmentSeconds =
      ((event.tick - currentTick) / song.timebase) * (60 / currentBpm)
    if (elapsedSeconds + segmentSeconds >= seconds) {
      return Math.floor(
        currentTick +
          ((seconds - elapsedSeconds) * song.timebase * currentBpm) / 60,
      )
    }
    elapsedSeconds += segmentSeconds
    currentTick = event.tick
    currentBpm = 60000000 / event.microsecondsPerBeat
  }

  return Math.floor(
    currentTick +
      ((seconds - elapsedSeconds) * song.timebase * currentBpm) / 60,
  )
}

export function ControlBridge() {
  const stores = useStores()
  const setSong = useSetSong()
  const { pushHistory, undo, redo } = useHistory()
  const {
    selectedTrackId,
    selectedNoteIds,
    setSelectedTrackId,
    setSelectedNoteIds,
  } = usePianoRoll()
  const {
    trackMute: trackMuteState,
    mute,
    unmute,
    solo,
    unsolo,
  } = useTrackMute()
  const handlerRef = useRef<
    ((command: ControlCommand) => Promise<unknown>) | undefined
  >(undefined)

  const getState = useCallback(() => {
    const song = stores.songStore.song
    return {
      project: {
        name: song.name,
        timebase: song.timebase,
        endTick: song.endOfSong,
        tempo: song.conductorTrack?.getTempo(stores.player.position) ?? 120,
        timeSignatures: song.timeSignatures.map((event) => ({
          tick: event.tick,
          numerator: event.numerator,
          denominator: event.denominator,
        })),
      },
      transport: {
        position: stores.player.position,
        isPlaying: stores.player.isPlaying,
        isRecording: stores.midiRecorder.isRecording,
      },
      selection: {
        trackId: selectedTrackId,
        noteIds: selectedNoteIds,
      },
      tracks: song.tracks.map((track, index) => ({
        id: track.id,
        index,
        name: track.name ?? "",
        channel: track.channel,
        isConductor: track.isConductorTrack,
        isRhythm: track.isRhythmTrack,
        muted: TrackMute.isMuted(track.id)(trackMuteState),
        solo: TrackMute.isSolo(track.id)(trackMuteState),
        volume: track.getVolume(0),
        pan: track.getPan(0),
        program: track.getProgramNumber(0),
        notes: track.events.filter(isNoteEvent).map((note) => ({
          id: note.id,
          tick: note.tick,
          duration: note.duration,
          noteNumber: note.noteNumber,
          velocity: note.velocity,
        })),
      })),
    }
  }, [selectedNoteIds, selectedTrackId, stores, trackMuteState])

  const execute = useCallback(
    async ({ operation, arguments: args = {} }: ControlCommand) => {
      const song = stores.songStore.song
      const trackFor = () => {
        const trackId = asInteger(args.trackId, "trackId") as TrackId
        const track = song.getTrack(trackId)
        if (!track || track.isConductorTrack) {
          throw new Error(`Editable track ${trackId} was not found`)
        }
        return track
      }
      const noteIds = () => {
        if (!Array.isArray(args.noteIds))
          throw new Error("noteIds must be an array")
        return args.noteIds.map((id) => asInteger(id, "noteId"))
      }

      switch (operation) {
        case "get_state":
          return getState()
        case "new_project": {
          const newSong = emptySong()
          if (typeof args.name === "string") newSong.name = args.name
          setSong(newSong)
          return getState()
        }
        case "import_midi": {
          const bytes = fromBase64(asString(args.base64, "base64"))
          const newSong = songFromMidi(bytes)
          if (typeof args.name === "string") newSong.name = args.name
          setSong(newSong)
          return getState()
        }
        case "export_midi":
          return {
            name: `${song.name || "signal-project"}.mid`,
            base64: toBase64(new Uint8Array(songToMidi(song))),
          }
        case "export_audio": {
          const renderSong =
            typeof args.midiBase64 === "string"
              ? songFromMidi(fromBase64(args.midiBase64))
              : song
          const format = asString(args.format, "format").toLowerCase()
          if (format !== "mp3" && format !== "wav") {
            throw new Error("format must be mp3 or wav")
          }
          const durationSeconds = asNumber(
            args.durationSeconds,
            "durationSeconds",
          )
          if (durationSeconds <= 0 || durationSeconds > 3600) {
            throw new Error("durationSeconds must be between 0 and 3600")
          }
          const sampleRate =
            args.sampleRate === undefined
              ? 44100
              : asInteger(args.sampleRate, "sampleRate")
          if (![22050, 44100, 48000].includes(sampleRate)) {
            throw new Error("sampleRate must be 22050, 44100, or 48000")
          }
          const bitrateKbps =
            args.bitrateKbps === undefined
              ? 128
              : asInteger(args.bitrateKbps, "bitrateKbps")
          if (![96, 128, 192, 256, 320].includes(bitrateKbps)) {
            throw new Error("bitrateKbps must be 96, 128, 192, 256, or 320")
          }
          const soundFontData = stores.synth.loadedSoundFont?.data
          if (soundFontData === undefined) {
            throw new Error(
              "No SoundFont is loaded. Wait for Signal to finish loading its instrument sounds.",
            )
          }

          const endTick = tickAtSeconds(renderSong, durationSeconds)
          const events = renderSong.allEvents
            .filter(
              (event) =>
                event.tick <= endTick ||
                (event.type === "channel" && event.subtype === "noteOff"),
            )
            .map((event) =>
              event.type === "channel" &&
              event.subtype === "noteOff" &&
              event.tick > endTick
                ? { ...event, tick: endTick }
                : event,
            )
            .filter((event) => event.tick <= endTick)

          const audioBuffer = await renderAudio(
            soundFontData,
            events,
            renderSong.timebase,
            sampleRate,
            {
              waitForEventLoop: () =>
                new Promise((resolve) => setTimeout(resolve, 0)),
            },
          )
          const exactFrames = Math.min(
            audioBuffer.length,
            Math.floor(durationSeconds * sampleRate),
          )
          const clipped = new AudioBuffer({
            length: exactFrames,
            numberOfChannels: audioBuffer.numberOfChannels,
            sampleRate,
          })
          for (
            let channel = 0;
            channel < audioBuffer.numberOfChannels;
            channel++
          ) {
            clipped.copyToChannel(
              audioBuffer.getChannelData(channel).subarray(0, exactFrames),
              channel,
            )
          }
          const encoded =
            format === "mp3"
              ? await encodeMp3(clipped, bitrateKbps)
              : await encodeWAV(clipped)
          return {
            name: `${renderSong.name || "signal-project"}.${format}`,
            format,
            durationSeconds: exactFrames / sampleRate,
            sampleRate,
            bitrateKbps: format === "mp3" ? bitrateKbps : undefined,
            byteLength: encoded.byteLength,
            base64: toBase64(encoded),
          }
        }
        case "set_project": {
          pushHistory()
          if (typeof args.name === "string") song.name = args.name
          if (args.timebase !== undefined) {
            const timebase = asInteger(args.timebase, "timebase")
            if (timebase < 1) throw new Error("timebase must be positive")
            song.timebase = timebase
          }
          return getState()
        }
        case "add_track": {
          pushHistory()
          const channel =
            args.channel === undefined
              ? Math.min(song.tracks.length - 1, 15)
              : asInteger(args.channel, "channel")
          if (channel < 0 || channel > 15)
            throw new Error("channel must be 0-15")
          const track = emptyTrack(channel)
          if (typeof args.name === "string") track.setName(args.name)
          song.addTrack(track)
          setSelectedTrackId(track.id)
          return { trackId: track.id, state: getState() }
        }
        case "duplicate_track": {
          const source = trackFor()
          pushHistory()
          const copy = source.clone()
          copy.channel = source.channel
          const index = song.tracks.findIndex((track) => track.id === source.id)
          song.insertTrack(copy, index + 1)
          setSelectedTrackId(copy.id)
          return { trackId: copy.id, state: getState() }
        }
        case "delete_track": {
          const track = trackFor()
          if (
            song.tracks.filter((item) => !item.isConductorTrack).length <= 1
          ) {
            throw new Error("The final editable track cannot be deleted")
          }
          pushHistory()
          song.removeTrack(track.id)
          const fallback = song.tracks.find((item) => !item.isConductorTrack)
          if (fallback) setSelectedTrackId(fallback.id)
          return getState()
        }
        case "update_track": {
          const track = trackFor()
          pushHistory()
          if (typeof args.name === "string") track.setName(args.name)
          if (args.channel !== undefined) {
            const channel = asInteger(args.channel, "channel")
            if (channel < 0 || channel > 15)
              throw new Error("channel must be 0-15")
            track.channel = channel
          }
          if (args.volume !== undefined) {
            const volume = asInteger(args.volume, "volume")
            if (volume < 0 || volume > 127)
              throw new Error("volume must be 0-127")
            track.setVolume(volume, 0)
          }
          if (args.pan !== undefined) {
            const pan = asInteger(args.pan, "pan")
            if (pan < 0 || pan > 127) throw new Error("pan must be 0-127")
            track.setPan(pan, 0)
          }
          if (args.program !== undefined) {
            const program = asInteger(args.program, "program")
            if (program < 0 || program > 127)
              throw new Error("program must be 0-127")
            track.createOrUpdate({
              ...programChangeMidiEvent(0, 0, program),
              tick: 0,
            })
          }
          return getState()
        }
        case "add_notes": {
          const track = trackFor()
          if (!Array.isArray(args.notes))
            throw new Error("notes must be an array")
          pushHistory()
          const notes = args.notes.map((input, index) => {
            if (!input || typeof input !== "object")
              throw new Error(`notes[${index}] is invalid`)
            const note = input as Record<string, unknown>
            const noteNumber = asInteger(
              note.noteNumber,
              `notes[${index}].noteNumber`,
            )
            const velocity =
              note.velocity === undefined
                ? 100
                : asInteger(note.velocity, `notes[${index}].velocity`)
            const duration = asInteger(
              note.duration,
              `notes[${index}].duration`,
            )
            const tick = asInteger(note.tick, `notes[${index}].tick`)
            if (noteNumber < 0 || noteNumber > 127)
              throw new Error("noteNumber must be 0-127")
            if (velocity < 1 || velocity > 127)
              throw new Error("velocity must be 1-127")
            if (tick < 0 || duration < 1)
              throw new Error("tick must be >= 0 and duration > 0")
            return {
              type: "channel" as const,
              subtype: "note" as const,
              noteNumber,
              velocity,
              duration,
              tick,
            }
          })
          const created = track.addEvents<NoteEvent>(notes)
          setSelectedTrackId(track.id)
          setSelectedNoteIds(created.map((note) => note.id))
          return { noteIds: created.map((note) => note.id), state: getState() }
        }
        case "update_notes": {
          const track = trackFor()
          if (!Array.isArray(args.notes))
            throw new Error("notes must be an array")
          pushHistory()
          track.updateEvents(
            args.notes.map((input, index) => {
              if (!input || typeof input !== "object")
                throw new Error(`notes[${index}] is invalid`)
              const note = input as Record<string, unknown>
              const update: Record<string, number> = {
                id: asInteger(note.id, `notes[${index}].id`),
              }
              for (const key of [
                "tick",
                "duration",
                "noteNumber",
                "velocity",
              ] as const) {
                if (note[key] !== undefined)
                  update[key] = asInteger(note[key], `notes[${index}].${key}`)
              }
              return update
            }),
          )
          return getState()
        }
        case "delete_notes": {
          const track = trackFor()
          const ids = noteIds()
          pushHistory()
          track.removeEvents(ids)
          track.updateEndOfTrack()
          return getState()
        }
        case "duplicate_notes": {
          const track = trackFor()
          pushHistory()
          const result = stores.commands.track.duplicateNotes(
            track.id,
            noteIds(),
            args.deltaTick === undefined
              ? 0
              : asInteger(args.deltaTick, "deltaTick"),
          )
          setSelectedNoteIds(result.addedNoteIds)
          return { ...result, state: getState() }
        }
        case "transpose_notes": {
          const track = trackFor()
          pushHistory()
          stores.commands.track.transposeNotes(
            track.id,
            noteIds(),
            asInteger(args.semitones, "semitones"),
          )
          return getState()
        }
        case "quantize_notes": {
          const track = trackFor()
          const gridTicks = asInteger(args.gridTicks, "gridTicks")
          if (gridTicks < 1) throw new Error("gridTicks must be positive")
          pushHistory()
          stores.commands.track.quantizeNotes(
            track.id,
            noteIds(),
            (tick) => Math.round(tick / gridTicks) * gridTicks,
          )
          return getState()
        }
        case "set_tempo": {
          const bpm = asNumber(args.bpm, "bpm")
          const tick =
            args.tick === undefined ? 0 : asInteger(args.tick, "tick")
          if (bpm <= 0 || bpm > 999)
            throw new Error("bpm must be between 0 and 999")
          pushHistory()
          song.conductorTrack?.setTempo(bpm, tick)
          return getState()
        }
        case "set_time_signature": {
          const numerator = asInteger(args.numerator, "numerator")
          const denominator = asInteger(args.denominator, "denominator")
          const tick =
            args.tick === undefined ? 0 : asInteger(args.tick, "tick")
          if (numerator < 1 || denominator < 1)
            throw new Error("time signature values must be positive")
          pushHistory()
          song.conductorTrack?.createOrUpdate<TrackEventOf<TimeSignatureEvent>>(
            {
              type: "meta",
              subtype: "timeSignature",
              tick,
              numerator,
              denominator,
              metronome: 24,
              thirtyseconds: 8,
            },
          )
          return getState()
        }
        case "set_mute": {
          const track = trackFor()
          if (args.muted === true) mute(track.id)
          else unmute(track.id)
          if (args.muted === true && track.channel !== undefined)
            stores.player.allSoundsOffChannel(track.channel)
          return getState()
        }
        case "set_solo": {
          const track = trackFor()
          if (args.solo === true) {
            solo(track.id)
            if (track.channel !== undefined)
              stores.player.allSoundsOffExclude(track.channel)
          } else {
            unsolo(track.id)
            if (track.channel !== undefined)
              stores.player.allSoundsOffChannel(track.channel)
          }
          return getState()
        }
        case "select_track": {
          const track = trackFor()
          setSelectedTrackId(track.id)
          return getState()
        }
        case "transport": {
          const action = asString(args.action, "action")
          if (action === "play") stores.player.play()
          else if (action === "pause" || action === "stop") stores.player.stop()
          else if (action === "seek")
            stores.player.position = asInteger(args.tick, "tick")
          else if (action === "record") {
            stores.midiRecorder.isRecording = true
            stores.player.play()
          } else if (action === "stop_recording") {
            stores.midiRecorder.isRecording = false
            stores.player.stop()
          } else throw new Error(`Unknown transport action: ${action}`)
          return getState()
        }
        case "undo":
          undo()
          return getState()
        case "redo":
          redo()
          return getState()
        default:
          throw new Error(`Unknown control operation: ${operation}`)
      }
    },
    [
      getState,
      mute,
      pushHistory,
      redo,
      setSelectedNoteIds,
      setSelectedTrackId,
      setSong,
      solo,
      stores,
      undo,
      unmute,
      unsolo,
    ],
  )

  handlerRef.current = execute

  useEffect(() => {
    const url = new URL(window.location.href)
    const queryToken = url.searchParams.get("controlToken")
    if (queryToken) {
      sessionStorage.setItem(TOKEN_KEY, queryToken)
      url.searchParams.delete("controlToken")
      window.history.replaceState({}, "", url)
    }
    const token = queryToken ?? sessionStorage.getItem(TOKEN_KEY)
    if (!token) return

    let cancelled = false
    const headers = {
      "content-type": "application/json",
      "x-signal-control-token": token,
    }
    const run = async () => {
      while (!cancelled) {
        try {
          const response = await fetch("/api/control/commands", { headers })
          if (!response.ok)
            throw new Error(`Control API returned ${response.status}`)
          const body = (await response.json()) as { commands: ControlCommand[] }
          for (const command of body.commands) {
            try {
              const result = await handlerRef.current?.(command)
              await fetch("/api/control/results", {
                method: "POST",
                headers,
                body: JSON.stringify({ id: command.id, ok: true, result }),
              })
            } catch (error) {
              await fetch("/api/control/results", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  id: command.id,
                  ok: false,
                  error: error instanceof Error ? error.message : String(error),
                }),
              })
            }
          }
        } catch (error) {
          console.warn("Signal control bridge disconnected", error)
          await new Promise((resolve) => window.setTimeout(resolve, 1000))
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
