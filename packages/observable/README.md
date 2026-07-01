# @signal-app/observable

## Purpose

Provides small, framework-agnostic observable primitives shared across workspaces.

## Responsibilities

- Event emitter primitive (`Emitter`).
- Subscription contract (`Observable`).
- Value wrapper with change notifications (`ObservableValue`).
- Subscription composition helper (`combineSubscription`).
- Shared unsubscribe type (`Unsubscribe`).

## Public API

Exported from `src/index.ts`:

- `Unsubscribe`
- `Observable`
- `Emitter`
- `ObservableValue`
- `combineSubscription`

## Usage Notes

- `Emitter` is a minimal subscribe/emit utility with `listenerCount`.
- `ObservableValue` emits only when the next value is different from the current value.
- `combineSubscription` converts multiple subscribe functions into one subscribe function that returns a single unsubscribe.

## Boundary Rules

- Keep this package generic and independent from domain-specific concepts.
- Do not add React, MobX, or sequencer-specific logic here.

## Libraries and External Factors

- No runtime dependencies.
- Intended to be used by both app and package code in this monorepo.
