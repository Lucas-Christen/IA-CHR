// Detecção simplificada no próprio Speech Recognition
recognition.continuous = true; // Fica sempre escutando
recognition.onresult = (event) => {
  const transcript = event.results[event.results.length - 1][0].transcript;
  
  // Detecta wake words manualmente
  if (transcript.toLowerCase().includes('jarvis') || 
      transcript.toLowerCase().includes('ei jarvis')) {
    console.log('🎤 Wake word detectado!');
    handleWakeWord(transcript);
  }
};