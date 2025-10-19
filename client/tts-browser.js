const synth = window.speechSynthesis;
let voices = [];
let speakingPromiseResolve = null; // Para controlar o fim da fala

// Função para carregar as vozes disponíveis
function populateVoiceList() {
    if (!synth) return;
    // Tenta pegar vozes pt-BR. Pode precisar ajustar critérios se não funcionar bem.
    voices = synth.getVoices().filter(voice => voice.lang.startsWith('pt')); 
    console.log("Vozes pt-BR disponíveis:", voices.map(v => v.name));

    // Corrige um bug comum onde getVoices() retorna vazio na primeira chamada
    if (voices.length === 0 && synth.onvoiceschanged === null) {
       synth.onvoiceschanged = populateVoiceList;
    }
}

// O evento 'voiceschanged' pode demorar um pouco
populateVoiceList();
// Garante que mesmo se demorar, a lista seja populada
if (synth && synth.onvoiceschanged !== undefined && voices.length === 0) {
  synth.onvoiceschanged = populateVoiceList;
}

/**
 * Faz o navegador falar o texto fornecido.
 * @param {string} text - O texto a ser falado.
 * @returns {Promise<void>} - Promessa que resolve quando a fala termina ou é cancelada.
 */
export function speakText(text) {
    // Cancela qualquer promessa pendente de fala anterior
    if (speakingPromiseResolve) {
        speakingPromiseResolve();
        speakingPromiseResolve = null;
    }
    
    return new Promise((resolve, reject) => {
        if (!synth) {
            console.error("Browser não suporta SpeechSynthesis.");
            return reject(new Error("SpeechSynthesis não suportado"));
        }

        if (synth.speaking) {
            console.warn("Interrompendo fala anterior antes de iniciar nova.");
            synth.cancel(); // Isso também vai disparar o 'onend' da fala anterior
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Tenta encontrar uma voz pt-BR (pode ajustar 'Google', 'Microsoft', 'Nativa' etc.)
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang === 'pt-BR') 
                            || voices.find(v => v.lang === 'pt-BR');
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log("Usando voz TTS:", preferredVoice.name);
        } else {
            utterance.lang = 'pt-BR'; 
            console.warn("Nenhuma voz pt-BR específica encontrada, usando padrão do navegador para pt-BR.");
        }
       
        utterance.pitch = 1; 
        utterance.rate = 1; // Velocidade da fala

        speakingPromiseResolve = resolve; // Guarda a função resolve da promessa atual

        utterance.onend = () => {
            console.log("TTS onend disparado.");
            if (speakingPromiseResolve) {
                speakingPromiseResolve(); // Resolve a promessa atual
                speakingPromiseResolve = null;
            }
        };

        utterance.onerror = (event) => {
            console.error("Erro no SpeechSynthesis:", event.error);
            if (speakingPromiseResolve) {
                 reject(event.error); // Rejeita a promessa atual
                 speakingPromiseResolve = null;
            }
        };
        
        // Pequeno delay após cancelar antes de falar, evita bugs em alguns navegadores
        setTimeout(() => {
            if (!synth.speaking) { // Verifica se realmente parou antes de falar
               synth.speak(utterance);
               console.log("Iniciando TTS...");
            } else {
               // Se ainda estiver falando (cancelamento demorou?), tenta de novo ou rejeita
               console.warn("TTS ainda falando após cancelamento, tentando falar de novo em breve...");
               setTimeout(() => synth.speak(utterance), 100); 
            }
        }, 50); // Ajuste pequeno delay se necessário

    });
}

/**
 * Cancela qualquer fala em andamento.
 */
export function cancelSpeech() {
    if (synth && synth.speaking) {
        synth.cancel();
        console.log("Fala TTS cancelada.");
        // Resolve a promessa pendente, se houver, indicando interrupção
        if (speakingPromiseResolve) {
             speakingPromiseResolve(); 
             speakingPromiseResolve = null;
        }
    }
}