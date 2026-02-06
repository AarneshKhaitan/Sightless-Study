# Document Source Spec (Upload now, Drive/OneDrive later)

Goal:
Support upload-only MVP, while designing a clean adapter for future sources.

## Core principle
All sources normalize into the same internal model:
- DocumentManifest
- chunks[]
- formulaModules[]
- visualModules[]
Everything after ingestion is source-agnostic.

## DocumentSource interface (conceptual)
Returns:
- pdfBlob (binary)
- meta:
  - displayName
  - sourceType: upload | gdrive | onedrive
  - externalId: string or null
  - lastSyncedAt: ISO timestamp

## MVP: UploadSource
- User selects local PDF via file picker.
Browser constraint:
- File picker cannot be opened purely by voice without a user gesture.
MVP UX:
- Provide one large Upload button to open picker.
- After selection, everything becomes voice-first.

## Future (not MVP)
- GoogleDriveSource and OneDriveSource via OAuth + APIs (or MCP connectors).
- externalId stores file IDs for sync/resume.

## Manifest fields to include now
manifest.source = { type, displayName, externalId, lastSyncedAt }

This makes future sync trivial.
