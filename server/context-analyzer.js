// server/context-analyzer.js
class ContextAnalyzer {
  constructor() {
    this.currentContext = {
      topic: null,
      emotion: 'neutral',
      lastAction: null,
      timeOfDay: this.getTimeOfDay()
    };
  }

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'madrugada';
    if (hour < 12) return 'manhã';
    if (hour < 18) return 'tarde';
    return 'noite';
  }

  analyzeEmotion(text) {
    const positiveWords = ['feliz', 'ótimo', 'adorei', 'excelente', 'obrigado'];
    const negativeWords = ['triste', 'ruim', 'problema', 'erro', 'frustrado'];
    
    const lower = text.toLowerCase();
    const positive = positiveWords.some(w => lower.includes(w));
    const negative = negativeWords.some(w => lower.includes(w));
    
    if (positive) return 'happy';
    if (negative) return 'sad';
    return 'neutral';
  }

  updateContext(userMessage, aiResponse) {
    this.currentContext.emotion = this.analyzeEmotion(userMessage);
    this.currentContext.lastAction = this.extractAction(aiResponse);
    
    return this.getContextPrompt();
  }

  getContextPrompt() {
    return `
[Contexto Atual]:
- Horário: ${this.currentContext.timeOfDay}
- Emoção detectada: ${this.currentContext.emotion}
- Última ação: ${this.currentContext.lastAction || 'nenhuma'}

Adapte sua resposta ao contexto emocional e temporal.
    `;
  }
}

module.exports = new ContextAnalyzer();