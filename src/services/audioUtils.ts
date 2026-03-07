/**
 * Utility for PCM audio processing
 */

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;

  async start(onAudioData: (base64Data: string) => void) {
    this.audioContext = new AudioContext({ sampleRate: 44100 });
    
    // Load the worklet
    // In Vite, we can use the URL constructor for the worklet file
    await this.audioContext.audioWorklet.addModule(new URL('./recorderWorklet.js', import.meta.url));
    
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    this.workletNode = new AudioWorkletNode(this.audioContext, 'recorder-worklet');
    
    this.workletNode.port.onmessage = (e) => {
      const pcmBuffer = e.data;
      const base64Data = this.arrayBufferToBase64(pcmBuffer);
      onAudioData(base64Data);
    };

    this.source.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination);
  }

  stop() {
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach(track => track.stop());
    this.audioContext?.close();
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private readonly SAMPLE_RATE = 44100;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
  }

  playChunk(base64Data: string) {
    if (!this.audioContext) return;
    
    const binary = window.atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Note: The model typically outputs at 24000Hz. 
    // We play it back at 44100Hz as requested for "fidelity", 
    // but we must ensure the buffer rate matches the context.
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    // We assume the incoming audio is 24kHz (standard Gemini output)
    // and we want to play it in a 44.1kHz context.
    // Simple way: create buffer with 24kHz and let AudioContext resample.
    const audioBuffer = this.audioContext.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }

  stop() {
    this.audioContext?.close();
    this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    this.nextStartTime = 0;
  }
}
