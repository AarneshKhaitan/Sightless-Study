// Audio recorder using MediaRecorder API
// Records audio from the microphone and returns a Blob

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let stream: MediaStream | null = null;
let recording = false;

export function isRecording(): boolean {
  return recording;
}

export async function startRecording(): Promise<void> {
  if (recording) return;

  stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  audioChunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      audioChunks.push(e.data);
    }
  };

  mediaRecorder.start();
  recording = true;
}

export function stopRecording(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder || !recording) {
      reject(new Error("Not recording"));
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];
      recording = false;

      // Stop all tracks to release the microphone
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }

      resolve(blob);
    };

    mediaRecorder.stop();
  });
}
