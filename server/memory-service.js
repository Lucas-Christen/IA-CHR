// server/memory-service.js
const fs = require('fs').promises;
const path = require('path');

const MEMORY_FILE = path.join(__dirname, 'data', 'jarvis-memory.json');
const USER_PROFILE_FILE = path.join(__dirname, 'data', 'user-profile.json');

class MemoryService {
  constructor() {
    this.shortTermMemory = []; // Últimas 10 conversas
    this.longTermMemory = {}; // Fatos importantes
    this.userProfile = {}; // Preferências do usuário
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
      await this.loadMemory();
    } catch (error) {
      console.log('🧠 Criando nova memória...');
    }
  }

  async loadMemory() {
    try {
      const memData = await fs.readFile(MEMORY_FILE, 'utf8');
      const profileData = await fs.readFile(USER_PROFILE_FILE, 'utf8');
      
      const memory = JSON.parse(memData);
      this.longTermMemory = memory.longTerm || {};
      this.shortTermMemory = memory.shortTerm || [];
      this.userProfile = JSON.parse(profileData);
      
      console.log('🧠 Memória carregada:', {
        fatos: Object.keys(this.longTermMemory).length,
        conversas: this.shortTermMemory.length
      });
    } catch (error) {
      console.log('🧠 Iniciando memória vazia');
    }
  }

  async saveMemory() {
    try {
      await fs.writeFile(MEMORY_FILE, JSON.stringify({
        longTerm: this.longTermMemory,
        shortTerm: this.shortTermMemory.slice(-10), // Últimas 10
        lastUpdated: new Date().toISOString()
      }, null, 2));
      
      await fs.writeFile(USER_PROFILE_FILE, JSON.stringify(this.userProfile, null, 2));
      
      console.log('💾 Memória salva');
    } catch (error) {
      console.error('❌ Erro ao salvar memória:', error);
    }
  }

  addToShortTerm(userMsg, aiResponse) {
    this.shortTermMemory.push({
      timestamp: Date.now(),
      user: userMsg,
      ai: aiResponse
    });
    
    if (this.shortTermMemory.length > 10) {
      this.shortTermMemory.shift();
    }
    
    this.saveMemory();
  }

  learnFact(category, key, value) {
    if (!this.longTermMemory[category]) {
      this.longTermMemory[category] = {};
    }
    this.longTermMemory[category][key] = value;
    this.saveMemory();
  }

  updateUserProfile(data) {
    this.userProfile = { ...this.userProfile, ...data };
    this.saveMemory();
  }

  getContext() {
    return {
      recentConversations: this.shortTermMemory,
      knownFacts: this.longTermMemory,
      userProfile: this.userProfile
    };
  }

  getContextPrompt() {
    const context = [];
    
    if (Object.keys(this.userProfile).length > 0) {
      context.push(`\n[Perfil do Usuário]:`);
      context.push(JSON.stringify(this.userProfile, null, 2));
    }
    
    if (Object.keys(this.longTermMemory).length > 0) {
      context.push(`\n[Fatos Conhecidos]:`);
      context.push(JSON.stringify(this.longTermMemory, null, 2));
    }
    
    return context.join('\n');
  }
}

module.exports = new MemoryService();