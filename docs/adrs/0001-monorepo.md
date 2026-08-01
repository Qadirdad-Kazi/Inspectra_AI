# ADR 0001: Monorepo with pnpm + Turborepo

## Status

Accepted

## Context

Inspectra spans UI, API, workers, and shared contracts.

## Decision

Use a pnpm workspace with Turborepo task orchestration.

## Consequences

Shared TypeScript packages, unified CI, selective builds. Worker images can still be built independently.
