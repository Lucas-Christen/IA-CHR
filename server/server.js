const express = require('express');
const cors = require('cors');
const { runChat, resetHistory, getHistory } = require('./gemini-service');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online',
    model: 'gemini-2.5-flash',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

// Chat com Gemini 2.5
app.post('/api/chat', async (req, res) => {
  try {
    const userInput = req.body.text;
    
    if (!userInput || typeof userInput !== 'string' || userInput.trim() === '') {
      return res.status(400).json({ error: 'Texto inválido' });
    }

    if (userInput.length > 1000) {
      return res.status(400).json({ error: 'Texto muito longo (máx 1000 chars)' });
    }

    console.log(`[User] 💬: "${userInput.substring(0, 100)}..."`);
    
    const geminiResponse = await runChat(userInput);

    if (!geminiResponse) {
      return res.status(500).json({ error: 'Erro ao processar resposta' });
    }
    
    console.log(`[Response] 📤: Type=${geminiResponse.type}`);
    res.json(geminiResponse);
    
  } catch (error) {
    console.error('[Chat Error] ❌:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Ver histórico
app.get('/api/history', (req, res) => {
  try {
    const history = getHistory();
    res.json({ 
      count: history.length / 2, // Divide por 2 (user + model)
      messages: history 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
});

// Reset histórico
app.post('/api/reset', (req, res) => {
  try {
    resetHistory();
    res.json({ message: 'Histórico resetado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resetar' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicia servidor
const server = app.listen(port, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     JARVIS Backend Server v2.0            ║');
  console.log('║     Powered by Gemini 2.5 Flash          ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n🚀 Servidor: http://localhost:${port}`);
  console.log(`🤖 Modelo: gemini-2.5-flash`);
  console.log(`⏰ Iniciado: ${new Date().toLocaleString('pt-BR')}`);
  console.log('\n📡 Endpoints disponíveis:');
  console.log('   GET  /health       - Status do servidor');
  console.log('   POST /api/chat     - Chat com JARVIS');
  console.log('   GET  /api/history  - Ver histórico');
  console.log('   POST /api/reset    - Limpar histórico');
  console.log('\n✨ Aguardando conexões...\n');
});

// Shutdown gracioso
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\n\n🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado com sucesso');
    process.exit(0);
  });
}