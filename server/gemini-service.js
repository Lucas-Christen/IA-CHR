// Importa o SDK e configura com a chave API do .env
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config(); // Carrega variáveis do .env

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Definição das Ferramentas (Funções que a IA pode chamar) ---
const tools = [
  {
    functionDeclarations: [
      {
        name: 'executar_animacao',
        description: 'Executa uma animação específica no personagem 3D.',
        parameters: {
          type: 'OBJECT',
          properties: {
            // Os nomes aqui devem corresponder aos seus arquivos sem o 'anim_'
            // Atualize esta lista se tiver mais animações
            nome_animacao: {
              type: 'STRING',
              description: 'O nome da animação a ser executada (ex: idle, talking, waving, sitting_down, spin, laying, pointing)',
            },
          },
          required: ['nome_animacao'],
        },
      },
      // Poderíamos adicionar mais ferramentas aqui no futuro
    ],
  },
];

// --- Configurações de Segurança ---
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- Instrução de Sistema (Personalidade da IA) ---
const systemInstruction = `Você é 'Aura', uma assistente de IA amigável e prestativa representada por um personagem 3D em um site. 
Seu trabalho é conversar com o usuário, responder perguntas gerais e, quando apropriado, 
executar animações usando a ferramenta 'executar_animacao'. 
Seja concisa e direta. Não invente informações. 
Se você não sabe a resposta, diga que não sabe.
Se o usuário pedir uma ação física que corresponda a uma animação disponível 
(idle, talking, waving, sitting_down, spin, laying, pointing), use a ferramenta 'executar_animacao'. 
Para conversas normais ou respostas a perguntas, apenas gere o texto da resposta.`;

// --- Modelo Generativo ---
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest', // Ou 'gemini-1.5-pro-latest'
  tools: tools,
  safetySettings: safetySettings,
  systemInstruction: systemInstruction,
});

// Histórico da conversa (simples)
let conversationHistory = [];

async function runChat(userInput) {
  try {
    const chat = model.startChat({
      history: conversationHistory,
    });

    const result = await chat.sendMessage(userInput);
    const response = result.response;
    const functionCalls = response.functionCalls();
    const text = response.text();

    // Adiciona a interação atual ao histórico
    conversationHistory.push({ role: 'user', parts: [{ text: userInput }] });
    conversationHistory.push(response.candidates[0].content);

    // Limita o histórico
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    if (functionCalls && functionCalls.length > 0) {
      console.log('Gemini solicitou Function Call:', functionCalls[0]);
      return {
        type: 'function_call',
        call: functionCalls[0] 
      };
    } else if (text) {
      console.log('Gemini respondeu com texto:', text);
      return { type: 'text', text: text };
    } else {
      console.warn('Gemini não retornou nem texto nem function call.');
      return { type: 'text', text: "Desculpe, não consegui processar isso." };
    }

  } catch (error) {
    console.error('Erro ao chamar a API Gemini:', error);
    if (error.message.includes('response was blocked due to safety')) {
         return { type: 'text', text: "Desculpe, não posso responder a isso por questões de segurança." };
    }
    return { type: 'text', text: "Ocorreu um erro ao me comunicar com a IA." };
  }
}

module.exports = { runChat };