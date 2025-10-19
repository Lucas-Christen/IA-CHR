const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();

// Inicializa o cliente Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Histórico da conversa
let conversationHistory = [];
const MAX_HISTORY = 20;

// System instruction para JARVIS
const systemInstruction = `Você é 'JARVIS', um assistente de IA avançado inspirado no Homem de Ferro.

Personalidade:
- Cortês, eficiente e perspicaz
- Tom profissional mas amigável  
- Humor sutil e inteligente quando apropriado
- Sempre prioriza segurança do usuário

Diretrizes:
- Respostas CONCISAS (máximo 2-3 frases)
- Se não souber, admita educadamente
- Nunca invente informações
- Seja proativo em oferecer ajuda

Animações disponíveis que você pode usar:
- idle: posição de repouso
- talking: animação de fala
- waving: acenar/cumprimentar
- sitting_down: sentar
- spin: girar/rotacionar
- laying: deitar
- pointing: apontar

Quando o usuário pedir uma ação física (acenar, sentar, girar, etc), você deve:
1. Confirmar a ação verbalmente
2. Indicar qual animação executar no formato: [ANIMAR:nome_da_animacao]

Exemplo:
User: "Acenar para mim"
Você: "Com prazer, senhor. [ANIMAR:waving]"`;

// Configuração do modelo
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp', // Modelo experimental mais recente
  systemInstruction: systemInstruction,
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 200,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

async function runChat(userInput) {
  try {
    if (!userInput || userInput.trim() === '') {
      throw new Error('Entrada vazia');
    }

    console.log(`[Gemini] Enviando: "${userInput}"`);

    // Inicia ou continua o chat
    const chat = model.startChat({
      history: conversationHistory,
    });

    const result = await chat.sendMessage(userInput);
    const response = result.response;
    const responseText = response.text()?.trim() || '';

    console.log(`[Gemini] Resposta: "${responseText}"`);

    // Adiciona ao histórico
    conversationHistory.push(
      { role: 'user', parts: [{ text: userInput }] },
      { role: 'model', parts: [{ text: responseText }] }
    );

    // Limita histórico
    if (conversationHistory.length > MAX_HISTORY) {
      conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }

    // Verifica se há comando de animação na resposta
    const animMatch = responseText.match(/\[ANIMAR:(\w+)\]/);
    
    if (animMatch) {
      const animationName = animMatch[1];
      const cleanText = responseText.replace(/\[ANIMAR:\w+\]/, '').trim();
      
      console.log(`[Gemini] 🎬 Animação detectada: ${animationName}`);
      
      return {
        type: 'function_call',
        call: {
          name: 'executar_animacao',
          args: { nome_animacao: animationName }
        },
        text: cleanText // Texto para falar junto
      };
    }

    // Resposta normal
    if (responseText) {
      return { 
        type: 'text', 
        text: responseText 
      };
    }

    return { 
      type: 'text', 
      text: "Desculpe, não consegui processar sua solicitação." 
    };

  } catch (error) {
    console.error('[Gemini] ❌ Erro:', error.message);
    
    // Tratamento de erros
    if (error.message.includes('API key')) {
      return { 
        type: 'text', 
        text: "Erro de autenticação. Verifique a chave API." 
      };
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      return { 
        type: 'text', 
        text: "Limite de requisições atingido. Tente em breve." 
      };
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      // Se o modelo experimental não funcionar, tenta o stable
      console.log('[Gemini] ⚠️ Tentando modelo stable...');
      return tryStableModel(userInput);
    }
    
    return { 
      type: 'text', 
      text: "Ocorreu um erro ao processar sua solicitação." 
    };
  }
}

// Fallback para modelo stable
async function tryStableModel(userInput) {
  try {
    const stableModel = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash', // Modelo stable
      systemInstruction: systemInstruction,
    });

    const chat = stableModel.startChat({
      history: conversationHistory,
    });

    const result = await chat.sendMessage(userInput);
    const responseText = result.response.text()?.trim() || '';

    console.log(`[Gemini Stable] Resposta: "${responseText}"`);

    // Verifica animação
    const animMatch = responseText.match(/\[ANIMAR:(\w+)\]/);
    
    if (animMatch) {
      const animationName = animMatch[1];
      const cleanText = responseText.replace(/\[ANIMAR:\w+\]/, '').trim();
      
      return {
        type: 'function_call',
        call: {
          name: 'executar_animacao',
          args: { nome_animacao: animationName }
        },
        text: cleanText
      };
    }

    return { type: 'text', text: responseText };

  } catch (error) {
    console.error('[Gemini Stable] ❌ Erro:', error.message);
    return { 
      type: 'text', 
      text: "Desculpe, tive dificuldades técnicas. Tente novamente." 
    };
  }
}

function resetHistory() {
  conversationHistory = [];
  console.log('[Gemini] 🔄 Histórico resetado');
}

function getHistory() {
  return conversationHistory;
}

module.exports = { runChat, resetHistory, getHistory };