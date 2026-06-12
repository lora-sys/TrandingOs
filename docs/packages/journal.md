# Journal (`packages/journal`)

**Status**: Canonical — matches current code

## Purpose
Trade journal normalization. Provides structured entry, signal, emotion, and screenshot recording for trade journaling.

## Key Concepts
- **Entry**: Trade journal entry with metadata
- **Signal**: Trade signal recording
- **Emotion**: Emotional state tagging for discipline tracking
- **Screenshot**: Evidence screenshot attachment

## API
- `GET /api/journal` — List journal entries
- `POST /api/journal` — Create journal entry

## Tables (SQLite)
- `journal_entries` — journal entries with type, metadata, timestamps

## Integration
Journal entries are used by Review Engine for daily/weekly review metrics and discipline scoring.
