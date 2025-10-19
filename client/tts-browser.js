const synth = window.speechSynthesis;
let voices = [];
let speakingPromiseResolve = null;

function populateVoiceList() {
    if (!synth) return;
    voices = synth.getVoices().filter(voice => voice.lang.startsWith('pt')); 
    console.log("🔊 Vozes disponíveis:", voices.length);

    if (voices.length === 0 && synth.onvoiceschanged === null) {
       synth.onvoiceschanged = populateVoiceList;
    }
}

populateVoiceList();
if (synth && synth.onvoiceschanged !== undefined) {
  synth.onvoiceschanged = populateVoiceList;
}

export function speakText(text) {
    if (speakingPromiseResolve) {
        speakingPromiseResolve();
        speakingPromiseResolve = null;
    }
    
    return new Promise((resolve, reject) => {
        if (!synth) {
            console.error("❌ SpeechSynthesis não suportado");
            return reject(new Error("SpeechSynthesis não suportado"));
        }

        if (synth.speaking) {
            console.warn("⚠️ Cancelando fala anterior");
            synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);

        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang === 'pt-BR') 
                            || voices.find(v => v.lang === 'pt-BR');
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
            console.log("🔊 Voz:", preferredVoice.name);
        } else {
            utterance.lang = 'pt-BR'; 
            console.warn("⚠️ Usando voz padrão pt-BR");
        }
       
        utterance.pitch = 1; 
        utterance.rate = 1.0;

        speakingPromiseResolve = resolve;

        utterance.onend = () => {
            console.log("✅ TTS finalizado");
            if (speakingPromiseResolve) {
                speakingPromiseResolve();
                speakingPromiseResolve = null;
            }
        };

        utterance.onerror = (event) => {
            console.error("❌ Erro no TTS:", event.error);
            if (speakingPromiseResolve) {
                 reject(event.error);
                 speakingPromiseResolve = null;
            }
        };
        
        setTimeout(() => {
            if (!synth.speaking) {
               synth.speak(utterance);
               console.log("🔊 Iniciando TTS...");
            } else {
               console.warn("⚠️ TTS ainda falando, tentando novamente...");
               setTimeout(() => synth.speak(utterance), 100); 
            }
        }, 50);
    });
}

export function cancelSpeech() {
    if (synth && synth.speaking) {
        synth.cancel();
        console.log("⏹️ TTS cancelado");
        if (speakingPromiseResolve) {
             speakingPromiseResolve(); 
             speakingPromiseResolve = null;
        }
    }
}