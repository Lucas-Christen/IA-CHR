// Imports the Google Cloud client library
const textToSpeech = require('@google-cloud/text-to-speech');
require('dotenv').config(); // Garante que as credenciais do .env sejam lidas

// Creates a client
// A autenticação acontece automaticamente via variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
const client = new textToSpeech.TextToSpeechClient();

async function generateSpeech(text) {
  // Configuração da requisição
  const request = {
    input: { text: text },
    // Selecione a voz e linguagem
    voice: { languageCode: 'pt-BR', ssmlGender: 'FEMALE', name: 'pt-BR-Standard-A' },
    // Selecione o tipo de áudio retornado
    audioConfig: { audioEncoding: 'MP3' }, // MP3 é bom para web
  };

  try {
    // Realiza a requisição de text-to-speech
    const [response] = await client.synthesizeSpeech(request);
    
    // Retorna o conteúdo do áudio (em Buffer)
    console.log(`Áudio gerado para: "${text.substring(0, 30)}..."`);
    return response.audioContent;

  } catch (error) {
    console.error('Erro ao chamar a API Text-to-Speech:', error);
    return null; // Retorna null em caso de erro
  }
}

module.exports = { generateSpeech };