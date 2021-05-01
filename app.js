import * as THREE from './node_modules/three/build/three.module.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
const renderer = new THREE.WebGLRenderer();
let fragmentShader, vertexShader;

let poses;
const worldAxis = new THREE.AxisHelper(5);

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(20, 20, -10);
camera.lookAt(new THREE.Vector3());

scene.add(camera, worldAxis);

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
  await loadImageData();
  await loadShaders();
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then(res => res.text());
  fragmentShader = await fetch('./fragment.glsl').then(res => res.text());
  console.log('Loaded shaders');
}

async function loadImageData() {
  const rawText = await fetch('./data/images.txt').then(res => res.text());
  poses = rawText
    .split(`\r\n`)
    .filter(line => {
      return line.endsWith('jpg');
    })
    .map(line => {
      const fields = line.split(' ');
      return {
        imageId: Number(fields[0]) - 1,
        quaternion: new THREE.Quaternion(...fields.slice(1, 4)).normalize(),
        translation: new THREE.Vector3(...fields.slice(5, 7)),
      };
    });
  console.log(poses);

  // rotate on X axis to match THREE handedness
  const adjustment = new THREE.Quaternion();
  adjustment.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2);

  poses.forEach(pose => {
    const axis = new THREE.AxisHelper();
    axis.position.copy(pose.translation);
    axis.applyQuaternion(pose.quaternion);
    axis.quaternion.multiply(adjustment);
    scene.add(axis);
  });
}
