// A URL base do seu servidor backend (onde roda o server.js)
const API_BASE_URL = 'http://localhost:3000';

/**
 * Envia o texto do usuário para o backend (que usa a API Gemini) e retorna a resposta.
 * @param {string} text - O texto digitado ou falado pelo usuário.
 * @returns {Promise<object>} - A resposta do backend (pode ser { type: 'text', text: '...' } ou { type: 'function_call', call: {...} })
 */
export async function sendChat(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            // Tenta pegar mais detalhes do erro do backend, se houver
            let errorDetails = `Erro HTTP: ${response.status} ${response.statusText}`;
            try {
                const errorJson = await response.json();
                errorDetails += ` - ${errorJson.error || JSON.stringify(errorJson)}`;
            } catch (e) { /* Ignora se não conseguir ler o corpo do erro */ }
            throw new Error(errorDetails);
        }

        const data = await response.json();
        console.log("Resposta recebida do backend:", data); // Log para depuração
        return data;

    } catch (error) {
        console.error('Falha ao enviar mensagem para o backend:', error);
        // Retorna um erro padrão em formato de texto para ser tratado no main.js
        return { type: 'text', text: 'Desculpe, tive um problema de comunicação com o servidor.' }; 
    }
}

// Não precisamos de uma função para chamar /api/tts aqui.