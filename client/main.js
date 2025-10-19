import { init, playAnimation } from './three-setup.js';
import { sendChat } from './api-service.js';
import { speakText, cancelSpeech } from './tts-browser.js';

let isListening = false;
let recognition = null;
let currentSpeakerPromise = null;

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'pt-BR';     
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;  

    recognition.onresult = async (event) => {
        isListening = false;
        const spokenText = event.results[0][0].transcript.trim();
        console.log('🎤 Você disse:', spokenText);
        
        if (spokenText) { 
             updateUI('processando'); 
             const response = await sendChat(spokenText);
             handleApiResponse(response);
        } else {
             console.log("Nenhum texto detectado.");
             updateUI('idle'); 
        }
    };

    recognition.onerror = (event) => {
        console.error('❌ Erro no reconhecimento:', event.error);
        let message = 'Erro ao ouvir.';
        if (event.error === 'no-speech') message = 'Não ouvi nada. Tente de novo.';
        if (event.error === 'audio-capture') message = 'Problema ao capturar áudio.';
        if (event.error === 'not-allowed') message = 'Permissão negada.';
        
        updateUI('idle', message);
        isListening = false;
    };

    recognition.onend = () => {
         console.log('🎤 Reconhecimento finalizado.');
         if (isListening) { 
             isListening = false;
             updateUI('idle', 'Não ouvi nada.');
         }
    };
}

// Botão principal
async function handleTalkButtonClick() {
    if (!recognition) {
        alert("Reconhecimento de voz não suportado.");
        return;
    }

    // Interrompe fala
    if (currentSpeakerPromise) { 
        console.log("⏹️ Interrompendo...");
        cancelSpeech();
        currentSpeakerPromise = null; 
        playAnimation('anim_idle'); 
        updateUI('idle');
        return;
    }
    
    // Para de ouvir
    if (isListening) {
        console.log("⏹️ Parando escuta...");
        recognition.stop();
        isListening = false;
        updateUI('idle');
        return;
    }

    // Começa a ouvir
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognition.start();
        isListening = true;
        updateUI('ouvindo');
    } catch (err) {
        console.error("❌ Erro microfone:", err);
        updateUI('idle', "Erro ao acessar microfone");
        isListening = false; 
    }
}

// Processa resposta da API
async function handleApiResponse(response) {
    if (!response) {
         updateUI('idle', 'Erro: sem resposta');
         return;
    }

    console.log("📦 Resposta:", response);

    if (response.type === 'function_call') {
        const functionCall = response.call;
        
        if (functionCall.name === 'executar_animacao' && 
            functionCall.args?.nome_animacao) {
            
            const animParam = functionCall.args.nome_animacao.toLowerCase();
            const animName = `anim_${animParam}`;
            
            console.log(`🎬 Animação: ${animName}`);
            playAnimation(animName);
            
            // Se tiver texto junto, fala também
            if (response.text && response.text.trim()) {
                updateUI('falando');
                try {
                    currentSpeakerPromise = speakText(response.text);
                    await currentSpeakerPromise;
                } catch (error) {
                    console.error("❌ Erro TTS:", error);
                } finally {
                    currentSpeakerPromise = null;
                }
            }
            
            updateUI('idle'); 

        } else {
             console.warn("⚠️ Function call inválida");
             updateUI('idle', 'Comando inválido');
        }

    } else if (response.type === 'text') {
        const textToSpeak = response.text;
        console.log(`💬 JARVIS: "${textToSpeak}"`);
        
        if (textToSpeak && textToSpeak.trim()) {
            playAnimation('anim_talking'); 
            updateUI('falando'); 
    
            try {
                currentSpeakerPromise = speakText(textToSpeak); 
                await currentSpeakerPromise; 
            } catch (error) {
                 console.error("❌ Erro TTS:", error);
            } finally {
                 playAnimation('anim_idle'); 
                 updateUI('idle'); 
                 currentSpeakerPromise = null; 
            }
        } else {
            updateUI('idle'); 
        }
    } else {
         console.error("❌ Tipo desconhecido:", response);
         updateUI('idle', 'Resposta inesperada');
    }
}

// Atualiza UI
const talkButton = document.getElementById('talk-button'); 
const statusDiv = document.getElementById('status-div'); 

function updateUI(state, message = '') {
    if (!talkButton || !statusDiv) return;

    const messages = {
        'idle': '🟢 Pronto',
        'ouvindo': '🎤 Ouvindo...',
        'processando': '🤔 Pensando...',
        'falando': '💬 Respondendo...'
    };

    statusDiv.textContent = message || messages[state] || 'Aguardando...';

    switch (state) {
        case 'idle':
            talkButton.textContent = '🎙️ Falar';
            talkButton.disabled = !recognition; 
            break;
        case 'ouvindo':
            talkButton.textContent = '⏹️ Parar';
            talkButton.disabled = false; 
            break;
        case 'processando':
            talkButton.textContent = '⏳ Processando';
            talkButton.disabled = true; 
            break;
         case 'falando':
             talkButton.textContent = '⏸️ Interromper';
             talkButton.disabled = false; 
             break;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    init();

    if (talkButton) {
        talkButton.addEventListener('click', handleTalkButtonClick);
        if (!recognition) { 
            talkButton.disabled = true;
            talkButton.textContent = '❌ Voz não suportada';
            if (statusDiv) statusDiv.textContent = 'Sem reconhecimento de voz';
        }
    }

    // Botões de teste
    const testButtons = document.getElementById('test-buttons');
    if (testButtons) {
        testButtons.addEventListener('click', (event) => {
             if (event.target.tagName === 'BUTTON') {
                const animName = event.target.dataset.anim; 
                if (animName) {
                    cancelSpeech(); 
                    currentSpeakerPromise = null; 
                    playAnimation(animName); 
                    updateUI('idle'); 
                }
             }
        });
    }

     updateUI('idle'); 
});