import { tickToMillisec } from "./tick.js"

export type SchedulableEvent = {
  tick: number
}

export interface EventSchedulerLoop {
  begin: number
  end: number
}

interface Jump {
  from: number
  to: number
}

export interface EventSchedulerSource<E extends SchedulableEvent> {
  timebase: number
  endOfSong: number
  getEvents(startTick: number, endTick: number): readonly E[]

  /*
   to restore synthesizer state (e.g. pitch bend)
   collect all previous state events
   and send them to the synthesizer
  */
  getCurrentStateEvents(tick: number): readonly Omit<E, "tick">[]
}

export interface SchedulerResult<E extends SchedulableEvent> {
  events: readonly WithTimestamp<E>[]
  shouldStop: boolean
}

type WithTimestamp<E> = {
  event: E
  timestamp: number
}

/**
 * Class for reading chronological events.
 * Perform lookahead to schedule accurately.
 * https://www.html5rocks.com/ja/tutorials/audio/scheduling/
 */
export class EventScheduler<E extends SchedulableEvent> {
  lookAheadTime = 100

  // Number of ticks per 1/4 beat
  timebase = 480

  loop: EventSchedulerLoop | null = null

  private _currentTick = 0
  private _scheduledTick = 0
  private _prevTime: number | undefined = undefined
  private _createLoopEndEvents: () => readonly Omit<E, "tick">[]
  private _stopEvents: Omit<E, "tick">[] | null = null
  private _scheduledSeekTick: number | null = null

  constructor(
    private readonly eventSource: EventSchedulerSource<E>,
    createLoopEndEvents: () => readonly Omit<E, "tick">[],
    tick = 0,
    lookAheadTime = 100,
  ) {
    this._createLoopEndEvents = createLoopEndEvents
    this._currentTick = tick
    this._scheduledTick = tick
    this.timebase = this.eventSource.timebase
    this.lookAheadTime = lookAheadTime
  }

  get scheduledTick() {
    return this._scheduledTick
  }

  millisecToTick(ms: number, bpm: number) {
    return (((ms / 1000) * bpm) / 60) * this.timebase
  }

  scheduleSeek(tick: number) {
    this._scheduledSeekTick = tick
  }

  /**
   * Queue events (e.g. all-sounds-off) to be sent on the next readNextEvents
   * call instead of immediately. This ensures they are scheduled with a
   * timestamp at least as far ahead as the look-ahead window used for
   * already-dispatched events, so they can't be scheduled to happen before
   * a note-on that was sent moments earlier.
   */
  scheduleStop(events: Omit<E, "tick">[]) {
    this._stopEvents = events
  }

  readNextEvents(bpm: number, timestamp: number): SchedulerResult<E> {
    const withTimestamp =
      (currentTick: number) =>
      (e: E): WithTimestamp<E> => {
        const waitTick = e.tick - currentTick
        const delayedTime =
          timestamp + Math.max(0, tickToMillisec(waitTick, bpm, this.timebase))
        return { event: e, timestamp: delayedTime }
      }

    const getEventsInRange = (
      startTick: number,
      endTick: number,
      currentTick: number,
    ) =>
      this.eventSource
        .getEvents(startTick, endTick)
        .map(withTimestamp(currentTick))

    if (this._prevTime === undefined) {
      this._prevTime = timestamp
    }
    const delta = timestamp - this._prevTime
    const deltaTick = Math.max(0, this.millisecToTick(delta, bpm))
    const nowTick = this._currentTick + deltaTick
    const lookAheadTick = this.millisecToTick(this.lookAheadTime, bpm)

    // Process from the last scheduled point to the lookahead time
    const startTick = this._scheduledTick
    const endTick = nowTick + lookAheadTick

    this._prevTime = timestamp

    if (this._stopEvents !== null) {
      const stopEvents = this._stopEvents
      this._stopEvents = null
      this._currentTick = nowTick
      this._scheduledTick = endTick

      const events = stopEvents.map((e) =>
        withTimestamp(nowTick)({ ...e, tick: endTick } as E),
      )
      return {
        events,
        shouldStop: true,
      }
    }

    // If a seek has been scheduled, jump to that tick instead of continuing
    // from the current position. If a loop is set, jump to the loop start.
    let jump: Jump | null = null

    if (this._scheduledSeekTick) {
      jump = {
        from: endTick,
        to: this._scheduledSeekTick,
      }
      this._scheduledSeekTick = null
    }
    if (
      this.loop !== null &&
      startTick < this.loop.end &&
      endTick >= this.loop.end
    ) {
      jump = {
        from: this.loop.end,
        to: this.loop.begin,
      }
    }

    if (jump) {
      const offset = endTick - jump.from
      const endTick2 = jump.to + offset
      const currentTick = jump.to - (jump.from - nowTick)
      this._currentTick = currentTick
      this._scheduledTick = endTick2

      const events = [
        ...getEventsInRange(startTick, jump.from, nowTick),
        ...this._createLoopEndEvents().map((e) =>
          withTimestamp(currentTick)({ ...e, tick: jump.to } as E),
        ),
        ...this.eventSource
          .getCurrentStateEvents(jump.to)
          .map((e) => withTimestamp(currentTick)({ ...e, tick: jump.to } as E)),
        ...getEventsInRange(jump.to, endTick2, currentTick),
      ]
      return {
        events,
        shouldStop: false,
      }
    } else {
      this._currentTick = nowTick
      this._scheduledTick = endTick

      return {
        events: getEventsInRange(startTick, endTick, nowTick),
        shouldStop: this._scheduledTick >= this.eventSource.endOfSong,
      }
    }
  }
}
