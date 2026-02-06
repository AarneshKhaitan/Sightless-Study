/// <reference types="vite/client" />

// Web Speech API types not fully covered by lib.dom
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}
