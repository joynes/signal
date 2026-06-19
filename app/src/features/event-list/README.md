# Event List Feature

## Purpose

Displays event-level song data in list form.

## Responsibilities

- Render MIDI/control events in editable lists.
- Support filtering and selection workflows.
- Sync list edits back to the timeline model.

## Representative Components and Hooks

- `EventList`: panel root for event inspection/editing.
- `EventListItem` and `EventListInput`: row-level editing controls.
- `useEventList`: drives visibility and selected-event filtering based on piano-roll selection.
- `EventController` (`lib/EventController.ts`): abstraction layer mapping each `TrackEvent` type to editable fields and value converters.

## Architecture Notes

- Event editing is type-driven: controller metadata defines input kind (`text`/`number`) and safe update conversion.
- Supports event-specific conversion rules, such as tempo conversion (`microsecondsPerBeat` <-> BPM) and clamped CC/value ranges.
- Panel open state is feature-local atom, while event source comes from shared track and piano-roll selection state.

## Libraries and External Factors

- Depends on `@signal-app/core` event model and helper conversions (`bpmToUSecPerBeat`, `uSecPerBeatToBPM`).
- Uses lodash flow/clamp pipelines for robust user input normalization.

## State Notes

- Use Jotai for feature-local UI state.
- Subscribe to core state through useSyncExternalStore bridges.
