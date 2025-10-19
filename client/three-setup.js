import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let model; 
let mixer; 
let clock = new THREE.Clock(); 
let animations = {}; // Objeto para guardar as AnimationActions
let currentAction = null; // Para saber qual animação está tocando

// *** IMPORTANTE: Verifique se estes nomes correspondem EXATAMENTE aos seus arquivos .glb ***
const animationNames = [
  'anim_idle', 
  'anim_laying',
  'anim_pointing',
  'anim_sitting_down',
  'anim_spin',
  'anim_talking', 
  'anim_waving', 
]; 

export function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2; // Ajuste a posição inicial da câmera se necessário
    camera.position.y = 1;

    const canvas = document.getElementById('three-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true }); // antialias melhora bordas
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Melhor resolução em telas HiDPI
    renderer.outputEncoding = THREE.sRGBEncoding; // Melhora cores

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0); // Ajusta o ponto para onde a câmera olha (centro do modelo)
    controls.update();

    // Luzes mais realistas
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); 
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6); // Luz de cima e de baixo
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);

    const loader = new GLTFLoader();

    loader.load('/models/personagem.glb', (gltf) => {
        model = gltf.scene;
        console.log('Modelo base carregado!', model);
        
        // Centralizar e escalar o modelo (ajuste os valores se necessário)
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center); // Centraliza na origem
        scene.add(model);

        // Configura o Animation Mixer
        mixer = new THREE.AnimationMixer(model);

        // Adiciona um listener para quando uma animação terminar
        mixer.addEventListener('finished', onAnimationFinished);

        // Carrega todas as animações
        loadAnimations();

    }, undefined, (error) => {
        console.error('Erro ao carregar o modelo:', error);
    });

    animate();
}

function loadAnimations() {
    const loader = new GLTFLoader();
    let animationsLoadedCount = 0;

    animationNames.forEach(name => {
        loader.load(`/models/${name}.glb`, (gltf) => {
            const clip = gltf.animations[0];
            if (clip) {
                const action = mixer.clipAction(clip);
                animations[name] = action; 
                console.log(`Animação carregada: ${name}`);

                 // Configurações padrão para a maioria das animações
                 if (name !== 'anim_idle' && name !== 'anim_talking') { // Idle e Talking terão loop
                    action.setLoop(THREE.LoopOnce, 1);
                    action.clampWhenFinished = true;
                 } else {
                     action.setLoop(THREE.LoopRepeat); // Idle e Talking ficam em loop
                 }

            } else {
                console.warn(`Nenhuma animação encontrada em ${name}.glb`);
            }

            animationsLoadedCount++;
            if (animationsLoadedCount === animationNames.length) {
                console.log('Todas as animações carregadas:', Object.keys(animations));
                // Começa com a animação 'idle' depois que todas carregaram
                playAnimation('anim_idle'); 
            }

        }, undefined, (error) => {
            console.error(`Erro ao carregar a animação ${name}:`, error);
        });
    });
}

// Função para tocar uma animação específica
export function playAnimation(name) {
    if (!mixer || !animations[name]) {
        console.warn(`Animação "${name}" não encontrada ou mixer não iniciado.`);
        return;
    }

    const nextAction = animations[name];

    // Se já estiver tocando a mesma animação, não faz nada (exceto se for para reiniciar)
    if (currentAction === nextAction && nextAction.isRunning()) {
        // Se precisar reiniciar uma animação que já está tocando (ex: 'talking')
        // nextAction.reset().play(); 
        return;
    }

    console.log(`Tocando animação: ${name}`);

    // Se houver uma animação tocando, faz fade out
    if (currentAction && currentAction.isRunning()) {
        currentAction.fadeOut(0.3); // Tempo suave de transição (0.3 segundos)
    }

    // Prepara e toca a próxima animação
    nextAction
        .reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(0.3) // Mesmo tempo de transição
        .play();

    currentAction = nextAction; // Atualiza a animação atual
}

// --- NOVO: Função chamada quando uma animação (não loop) termina ---
function onAnimationFinished(event) {
    // Verifica se a animação que terminou não é a 'idle' ou 'talking'
    if (event.action.getClip().name !== 'anim_idle' && event.action.getClip().name !== 'anim_talking') {
        console.log(`Animação ${event.action.getClip().name} terminou, voltando para idle.`);
        playAnimation('anim_idle'); // Volta para a animação idle
    }
}


function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 

    if (mixer) {
        mixer.update(delta);
    }

    controls.update(); // Atualiza se a câmera foi movida pelo usuário
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Atualiza pixel ratio também
});