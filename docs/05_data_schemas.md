# Data Schemas

These schemas define the internal contract. They can be stored locally in MVP and moved server-side later.

## DocumentManifest
- docId
- title
- pages: [{ pageNo, modules: [{type, id}] }]
- outline (optional): sections with page ranges
- source: { type, displayName, externalId, lastSyncedAt }

## Chunk
- chunkId (e.g., p3-c2)
- pageNo
- order
- type: heading | paragraph | bullets | caption
- text

## GuideState
- docId
- pageNo
- chunkIndex (index within sorted chunks for that page)
- mode: READING | FORMULA | VISUAL
- modeId (formulaId or visualId)

## FormulaModule
- formulaId
- pageNo
- expression (text)
- purpose
- symbols: [{sym, meaning}]
- example

## VisualModule
- visualId
- pageNo
- type: line_graph | flowchart | regions | table
- title
- description
- data: (type-specific)

## ExplorationTrace
- visualId
- startedAt
- durationSec
- events[] (enter_feature, dwell_read, mark, guide_step)
- marked[] (points/nodes)
- visited[] (feature labels)
