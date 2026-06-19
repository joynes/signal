# @signal-app/api

## Purpose

Provides Firebase-backed repository APIs for cloud song, binary data, MIDI import, and user profiles.

## Responsibilities

- Expose factory functions that return repository interfaces, e.g. `createCloudSongRepository`, `createCloudSongDataRepository`, and `createUserRepository`.
- Encapsulate Firestore schema conversion with `FirestoreDataConverter` and return domain-friendly values (`Date`, `Uint8Array`, typed entities).
- Perform mutation flows inside `runTransaction` to keep writes consistent.
- Integrate with Firebase Functions for remote MIDI ingestion via `storeMidiFile`.

## Representative APIs

- `createCloudSongRepository(firestore, auth)`
- `createCloudSongDataRepository(firestore, auth)`
- `createCloudMidiRepository(firestore, functions)`
- `createUserRepository(firestore, auth)`

Key repository capabilities include:

- Song lifecycle: `create`, `update`, `delete`, `publish`, `unpublish`, `getMySongs`, `getPublicSongs`, `incrementPlayCount`.
- Song binary payload: `create/get/update/delete` of `Uint8Array` data through Firestore `Bytes`.
- User profile and auth observation: `getCurrentUser`, `getByUsername`, `observeCurrentUser`, `observeAuthUser`.

## Architecture Notes

- Public API is interface-first (`ICloudSongRepository`, `ICloudSongDataRepository`, `ICloudMidiRepository`, `IUserRepository`).
- Factories hide concrete class implementations and keep consumers decoupled.
- Conversion helpers such as `toSong` and `convertUser` isolate Firestore-specific types from callers.

## Libraries and External Factors

- Uses Firebase Auth, Firestore, and Cloud Functions SDKs.
- Query behavior and sort fields depend on Firestore indexes (see repository-level Firestore rules/index configs).
- Cloud write/read behavior depends on auth state; unauthenticated operations throw explicit errors.
