# API Contract (optional backend)

Base: /api

## POST /documents/upload
Input: multipart PDF file
Output: { docId, status }

## GET /documents/{docId}/manifest
Returns DocumentManifest

## GET /documents/{docId}/chunks
Returns { docId, chunks: [...] }

## GET /modules/formulas?docId=...&pageNo=...
Returns { formulas: [...] }

## GET /modules/visuals?docId=...&pageNo=...
Returns { visuals: [...] }

## POST /qa
Body: { docId, pageNo, chunkId, question }
Returns: { answer, citations: [{pageNo, chunkId}] }

## POST /explore/reflect
Body: { docId, visualId, trace }
Returns: { reflection, takeaway, nextSuggestion }

## POST /artifacts
Body: { docId, scope, types }
Returns: recap/flashcards/quiz objects

MVP note:
- QA/reflect/artifacts can be template-based; LLM can be added later.
