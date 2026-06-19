# firebaseui-web-react

## Purpose

Provides a React wrapper component for FirebaseUI Auth with predictable mount/unmount and auth-state reset behavior.

## Responsibilities

- Expose `FirebaseAuthUI` component accepting `uiConfig`, `firebaseAuth`, and optional `uiCallback`.
- Reuse or create `firebaseui.auth.AuthUI` instances safely.
- Reset widget state on sign-out and on popup flow rerender to avoid stale sessions.

## Representative API

- `FirebaseAuthUI(props)` in `src/index.tsx`
  - Props: `uiConfig`, `firebaseAuth`, `uiCallback`, `className`, `style`
  - Internals: subscribes to `onAuthStateChanged`, starts widget on mounted element ref, and resets on cleanup.

## Architecture Notes

- Implements imperative FirebaseUI startup inside `useEffect` while keeping declarative React boundary.
- Uses singleton retrieval `AuthUI.getInstance()` to avoid duplicate widget instances.
- Designed as a small compatibility layer and intentionally keeps surface area minimal.

## Libraries and External Factors

- Peer dependencies: `firebase`, `firebaseui`, `react`, `react-dom`.
- Runtime behavior depends on FirebaseUI configuration and enabled auth providers in Firebase console.
