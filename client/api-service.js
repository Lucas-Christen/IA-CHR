const API_BASE_URL = 'http://localhost:3000';

export async function sendChat(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text }),
        });

        if (!response.ok) {
            let errorDetails = `Erro HTTP: ${response.status}`;
            try {
                const errorJson = await response.json();
                errorDetails += ` - ${errorJson.error}`;
            } catch (e) {}
            throw new Error(errorDetails);
        }

        const data = await response.json();
        console.log("📨 Resposta do backend:", data);
        return data;

    } catch (error) {
        console.error('❌ Falha na comunicação:', error);
        return { 
            type: 'text', 
            text: 'Desculpe, tive um problema de comunicação com o servidor.' 
        }; 
    }
}