import * as THREE from './vendor/three.module.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
const renderer = new THREE.WebGLRenderer();
let fragmentShader, vertexShader;

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.z = 2;
scene.add(camera);

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.render(scene, camera);
});

loadScene();

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

async function loadScene() {
  await loadShaders();
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then(res => res.text());
  fragmentShader = await fetch('./fragment.glsl').then(res => res.text());
  console.log('Loaded shaders');
}
