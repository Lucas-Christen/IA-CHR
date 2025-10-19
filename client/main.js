import { init, playAnimation } from './three-setup.js';

// Inicializa a cena 3D
init();

// --- NOVO: Adiciona funcionalidade aos botões de teste ---
const testButtonsContainer = document.getElementById('test-buttons');

testButtonsContainer.addEventListener('click', (event) => {
    if (event.target.tagName === 'BUTTON') {
        const animName = event.target.dataset.anim; // Pega o nome da animação do atributo data-anim
        if (animName) {
            playAnimation(animName); // Chama a função exportada de three-setup.js
        }
    }
});

// --- Futuramente, a lógica de STT, API e TTS entrará aqui ---
// Exemplo:
// function handleApiResponse(response) {
//     if (response.call === 'executar_animacao') {
//         const animName = 'anim_' + response.parameters.tipo_de_acao; // Ex: 'anim_spin'
//         playAnimation(animName);
//     } else if (response.call === 'responder_pergunta') {
//         const textToSpeak = response.parameters.texto_da_resposta;
//         playAnimation('anim_talking'); // Inicia animação de fala
//         // Chama a função para buscar e tocar o áudio TTS
//         fetchAndPlayTTS(textToSpeak).then(() => {
//              // Opcional: Voltar para idle QUANDO o áudio terminar, se a animação 'talking' não for loop
//              // if (currentAction === animations['anim_talking']) { // Verifica se ainda está falando
//              //    playAnimation('anim_idle');
//              // }
//         });
//     }
// }