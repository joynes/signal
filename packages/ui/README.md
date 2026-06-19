# @signal-app/ui

## Purpose

Provides reusable UI components shared across Signal workspaces.

## Responsibilities

- Shared component primitives.
- Consistent component APIs.
- Presentation-level building blocks for features.

## Representative Components and APIs

- Form and controls: `Button`, `IconButton`, `Checkbox`, `RadioButton`, `Slider`, `Select`, `TextField`.
- Overlay and feedback: `Dialog`, `ActionDialog`, `PromptDialog`, `LoadingDialog`, `ProgressDialog`, `Tooltip`, `Alert`.
- Menus: `Menu`, `MenuItem`, `SubMenu`, `ContextMenu`.
- Layout helpers: `Toolbar`, `ToolbarButton`, `ToolbarButtonGroup`, `Positioned`, progress indicators.

All major exports are surfaced from `src/index.ts`.

## Boundary Rules

- Keep components presentation-focused.
- Delegate domain state decisions to consumers.

## Architecture Notes

- Styling uses Emotion and CSS custom properties (`--color-*`) for theme-driven lookups.
- Interaction primitives are built on Radix UI components for accessibility and focus management.
- Dialog integration composes with `dialog-hooks` contexts (for example `ActionDialog` reads `DialogContext`).

## Libraries and External Factors

- Peer dependencies include Emotion, Radix primitives/components, React, and `dialog-hooks`.
- Visual behavior depends on host app CSS variables and theme setup.
