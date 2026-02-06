# Pointer Explore Spec

## Input
- Mouse/trackpad pointer movement on an Explore Canvas.
- No keyboard required.

## Sampling
- Throttle pointer events to ~8–12 Hz.
- Track velocity for dwell detection:
  - dwell if pointer speed stays low for ~500 ms

## Narration throttling
Speak only when:
- entering a new semantic region (node/region/feature)
- dwell triggers (read precise meaning)
- proximity threshold to key features triggers (min/peak)
Otherwise remain quiet or use extremely short cues.

## Supported visual module types (MVP)
### line_graph
- Use points array: interpolate y for pointer x position
- Provide narration:
  - x and y values
  - trend (increasing/decreasing)
  - proximity to min/peak

### flowchart
- Nodes with normalized positions and radius
- Nearest node within radius becomes active region
- Narration:
  - node name
  - node description
  - optional: next/previous nodes

## Guidance mode (voice)
“Guide me to minimum/peak”
- system selects a target feature point
- gives directional instructions based on pointer vs target:
  - “Move right/left/up/down”
- optional audio beacon:
  - beep rate increases when closer
