const express = require('express');
const cors = require('cors');
const { runChat } = require('./gemini-service');
const { generateSpeech } = require('./tts-service'); // Importa o serviço TTS

const app = express();
const port = 3000; // Porta onde o backend vai rodar

// Middlewares
app.use(cors()); // Habilita CORS
app.use(express.json()); // Permite entender JSON

// Endpoint para o Chat com Gemini
app.post('/api/chat', async (req, res) => {
  const userInput = req.body.text;
  if (!userInput) {
    return res.status(400).json({ error: 'Texto do usuário não fornecido.' });
  }

  console.log(`\n[User Input]: ${userInput}`);
  const geminiResponse = await runChat(userInput);

  if (!geminiResponse) {
     return res.status(500).json({ error: 'Erro ao processar a resposta da IA.' });
  }
  
  console.log(`[Backend Response]: Type=${geminiResponse.type}`);
  res.json(geminiResponse); 
});

// Endpoint para Text-to-Speech
app.post('/api/tts', async (req, res) => {
  const textToSpeak = req.body.text;
  if (!textToSpeak) {
    return res.status(400).json({ error: 'Texto para fala não fornecido.' });
  }

  console.log(`\n[TTS Request]: "${textToSpeak.substring(0, 50)}..."`);
  const audioBuffer = await generateSpeech(textToSpeak);

  if (!audioBuffer) {
    return res.status(500).json({ error: 'Erro ao gerar o áudio.' });
  }

  // Envia o áudio de volta para o frontend
  res.setHeader('Content-Type', 'audio/mpeg');
  res.send(audioBuffer);
  console.log('[TTS Response]: Audio MP3 enviado.');
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});