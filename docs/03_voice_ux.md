# Voice UX Spec

## Principles
- Voice is primary.
- App is operable without seeing buttons.
- System always tells the user what they can say next.
- Use earcons (short sounds) to indicate state changes.

## Voice states
1) Speaking (TTS)
2) Listening (ASR active)
3) Executing (processing an action)

Rule: Do not listen while speaking (avoid feedback loops).

## Global commands
- Help / List options
- Where am I
- Repeat
- Continue
- Go back
- Stop

## Reading mode commands
- Summarize this page
- Question: <freeform>
- Simpler / More detailed

## Formula mode commands
- Symbols
- Example
- Intuition
- Continue
- Repeat

## Visual Explorer commands
- Start exploring
- What is here
- Mark this
- Guide me to minimum / peak / intersection
- Next key point
- Explain what I did
- I’m done

## Error handling
- If intent not understood: “I didn’t catch that. Say Help to hear options.”
- If command conflicts with mode: explain the allowed commands for the current mode.
