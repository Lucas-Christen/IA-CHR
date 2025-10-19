import { init, playAnimation } from './three-setup.js';
import { sendChat } from './api-service.js';
import { speakText, cancelSpeech } from './tts-browser.js'; // Importa o TTS do navegador

let isListening = false;
let recognition = null;
let currentSpeakerPromise = null; // Guarda a promessa da fala atual

// --- Configuração do Speech Recognition (STT) ---
// Verifica se a API está disponível no navegador
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.lang = 'pt-BR';     
    recognition.interimResults = false; 
    recognition.maxAlternatives = 1;  

    recognition.onresult = async (event) => {
        isListening = false; // Parou de ouvir assim que obteve resultado
        const spokenText = event.results[0][0].transcript.trim();
        console.log('Texto falado:', spokenText);
        
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
        console.error('Erro no reconhecimento de voz:', event.error);
        let message = 'Erro ao ouvir.';
        if (event.error === 'no-speech') message = 'Não ouvi nada. Tente de novo.';
        if (event.error === 'audio-capture') message = 'Problema ao capturar áudio.';
        if (event.error === 'not-allowed') message = 'Permissão para microfone negada.';
        
        updateUI('idle', message);
        isListening = false;
    };

    recognition.onend = () => {
         console.log('Reconhecimento finalizado.');
         if (isListening && talkButton.textContent.includes('Ouvindo')) { 
             isListening = false;
             updateUI('idle', 'Não ouvi nada, tente de novo.');
         }
    };

} else {
    console.error("Web Speech Recognition API não suportada neste navegador.");
}

// --- Função Principal de Interação ---
async function handleTalkButtonClick() {
    if (!recognition) {
        alert("Reconhecimento de voz não suportado.");
        return;
    }

    // *** CORREÇÃO 2: Alterado if (synth.speaking || currentSpeakerPromise) para if (currentSpeakerPromise) ***
    // Se estiver falando (verificando pela existência da promessa), interrompe a fala e volta para idle
    if (currentSpeakerPromise) { 
        console.log("Interrompendo fala...");
        cancelSpeech(); // Cancela TTS do navegador
        // A promessa será resolvida/rejeitada por cancelSpeech, limpamos ela no finally do handleApiResponse ou aqui se necessário
        currentSpeakerPromise = null; 
        playAnimation('anim_idle'); 
        updateUI('idle');
        return;
    }
    
    // Se estiver ouvindo, para de ouvir
    if (isListening) {
        console.log("Parando de ouvir...");
        recognition.stop();
        isListening = false;
        updateUI('idle');
        return;
    }

    // Se não está ouvindo nem falando, começa a ouvir
    try {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(err => {
             console.error("Erro inicial ao pegar permissão:", err); 
             throw err; 
        }); 
        
        console.log("Iniciando reconhecimento...");
        recognition.start();
        isListening = true;
        updateUI('ouvindo');

    } catch (err) {
        console.error("Erro ao acessar microfone:", err);
        let message = "Não foi possível acessar o microfone.";
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
            message = "Permissão para microfone negada.";
        }
        // alert(message + " Verifique as permissões do navegador."); // Comentado alert para não ser intrusivo
        updateUI('idle', message); // Mostra o erro no status
        isListening = false; 
    }
}


// --- Processamento da Resposta da API ---
async function handleApiResponse(response) {
    if (!response) {
         updateUI('idle', 'Erro: Resposta vazia do servidor.');
         return;
    }

    console.log("Processando resposta:", response);

    if (response.type === 'function_call') {
        const functionCall = response.call;
        // Validação mais robusta dos argumentos
        if (functionCall.name === 'executar_animacao' && functionCall.args?.nome_animacao && typeof functionCall.args.nome_animacao === 'string') {
            const animParam = functionCall.args.nome_animacao.toLowerCase(); // Garante minúsculas
            const animName = `anim_${animParam.replace(/ /g, '_')}`; // Constrói nome do arquivo
            
            console.log(`Executando animação via function call: ${animName}`);
            
            // Verifica se a animação existe no array global (declarado em three-setup.js, importado aqui se necessário)
            // Ou, melhor ainda, a função playAnimation já faz essa checagem
            playAnimation(animName); 
            updateUI('idle'); 

        } else {
             console.warn("Function Call 'executar_animacao' inválida ou com argumentos faltando:", functionCall);
             updateUI('idle', 'Recebi um comando de animação inválido.');
             // Opcional: Falar erro pro usuário
             // currentSpeakerPromise = speakText('Desculpe, não entendi qual animação fazer.');
             // await currentSpeakerPromise;
             // playAnimation('anim_idle');
             // updateUI('idle');
        }

    } else if (response.type === 'text') {
        const textToSpeak = response.text;
        console.log(`IA respondeu com texto: "${textToSpeak}"`);
        
        if (textToSpeak && textToSpeak.trim() !== '') { // Só fala se tiver texto não vazio
            playAnimation('anim_talking'); 
            updateUI('falando'); 
    
            try {
                currentSpeakerPromise = speakText(textToSpeak); 
                await currentSpeakerPromise; 
                console.log("Terminou de falar, voltando para idle.");
            } catch (error) {
                 console.error("Erro durante o TTS:", error);
                 // O finally cuidará de voltar para idle
            } finally {
                 if (currentAction === animations['anim_talking']) { // Só volta pra idle se AINDA estiver falando (pode ter sido interrompido por outra anim)
                    playAnimation('anim_idle'); 
                 }
                 updateUI('idle'); 
                 currentSpeakerPromise = null; 
            }
        } else {
            console.warn("Recebido tipo 'text' mas sem conteúdo de texto.");
            updateUI('idle'); 
        }
       
    } else {
         console.error("Tipo de resposta desconhecido do backend:", response);
         updateUI('idle', 'Recebi uma resposta inesperada do servidor.');
    }
}

// --- Atualização da Interface (feedback visual) ---
const talkButton = document.getElementById('talk-button'); 
const statusDiv = document.getElementById('status-div'); 

// Variáveis globais animationNames e currentAction/animations precisam ser acessíveis aqui se o finally precisar delas
// Idealmente, three-setup.js poderia exportar uma função `getCurrentActionName()`
// Por ora, vamos assumir que o finally sempre volta pra idle se não for interrompido
let animationNames = []; // Deveria ser preenchido ou importado de three-setup
let currentAction = null; // Idem
let animations = {}; // Idem (Se precisar acessar diretamente)


function updateUI(state, message = '') {
    if (!talkButton || !statusDiv) {
         // Não loga mais erro aqui, pois pode ser chamado antes do DOM carregar completamente
         return;
    }

    statusDiv.textContent = message || 
        (state === 'idle' ? 'Pronto.' : 
         state === 'ouvindo' ? 'Estou ouvindo...' :
         state === 'processando' ? 'Pensando...' :
         state === 'falando' ? 'Respondendo...' : '');

    switch (state) {
        case 'idle':
            talkButton.textContent = 'Falar';
            talkButton.disabled = !recognition; 
            break;
        case 'ouvindo':
            talkButton.textContent = 'Ouvindo... (Clique para parar)';
            talkButton.disabled = false; 
            break;
        case 'processando':
            talkButton.textContent = 'Processando...';
            talkButton.disabled = true; 
            break;
         case 'falando':
             talkButton.textContent = 'Falando... (Clique para interromper)';
             talkButton.disabled = false; 
             break;
        default:
            talkButton.textContent = 'Falar';
            talkButton.disabled = !recognition;
    }
}

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a cena 3D primeiro
    init();

    // Configura o botão principal de "Falar"
    if (talkButton) {
        talkButton.addEventListener('click', handleTalkButtonClick);
        if (!recognition) { 
            talkButton.disabled = true;
            talkButton.textContent = 'Voz não suportada';
            if (statusDiv) statusDiv.textContent = 'Reconhecimento de voz não disponível.';
        }
    } else {
         console.error("Botão 'talk-button' não foi encontrado no HTML!");
    }
    if (!statusDiv) {
         console.error("Div 'status-div' não foi encontrado no HTML!");
    }

    // Mantém os botões de teste
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

    // Define estado inicial da UI após carregar e elementos estarem disponíveis
     updateUI('idle'); 
     // *** CORREÇÃO 1: Removida a chamada setTimeout(populateVoiceList, 500); ***
});

// Importa as variáveis de three-setup.js se necessário (melhor evitar dependência direta se possível)
// import { animationNames as importedNames, currentAction as importedAction, animations as importedAnims } from './three-setup.js';
// animationNames = importedNames;
// currentAction = importedAction;
// animations = importedAnims;