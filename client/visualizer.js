// client/visualizer.js
export class AudioVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  }

  async connectMicrophone() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.draw();
  }

  draw() {
    requestAnimationFrame(() => this.draw());
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const barWidth = this.canvas.width / this.dataArray.length;
    let x = 0;
    
    for (let i = 0; i < this.dataArray.length; i++) {
      const barHeight = (this.dataArray[i] / 255) * this.canvas.height;
      
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
}