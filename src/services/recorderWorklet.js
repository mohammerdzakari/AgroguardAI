/**
 * AudioWorkletProcessor for capturing and converting audio to 16-bit PCM.
 */
class RecorderWorklet extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Convert Float32Array to Int16Array (PCM 16-bit)
      const pcmData = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Send the buffer to the main thread
      this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
    }
    return true;
  }
}

registerProcessor('recorder-worklet', RecorderWorklet);
