// import * as THREE from './node_modules/three/build/three.module.js';
import * as THREE from './vendor/three.module.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
const renderer = new THREE.WebGLRenderer();

let proxyGeo, proxyMat, proxy;

let fragmentShader, vertexShader;
let poses;

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, -10);
camera.lookAt(new THREE.Vector3());
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target = new THREE.Vector3(0, 0, 0);
controls.panSpeed = 2;

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.render(scene, camera);
});

loadScene();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadScene() {
  await loadImageData();
  await loadGeometry();
  await loadShaders();
  makeProxy();
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then((res) => res.text());
  fragmentShader = await fetch('./fragment.glsl').then((res) => res.text());
  console.log('Loaded shaders');
}

async function loadGeometry() {
  return new Promise((res) => {
    const loader = new OBJLoader();
    loader.load('data/proxy.obj', (proxyObj) => {
      proxyGeo = proxyObj.children[0].geometry.clone();
      console.log('loaded geometry');
      res();
    });
  });
}

async function loadImageData() {
  const rawText = await fetch('./data/images.txt').then((res) => res.text());
  poses = rawText
    .split(`\r\n`)
    .filter((line) => {
      return line.endsWith('jpg');
    })
    .map((line) => {
      const fields = line.split(' ');
      const qua = new THREE.Quaternion(
        Number(fields[2]),
        Number(fields[3]),
        Number(fields[4]),
        Number(fields[1])
      );
      const rotMat = new THREE.Matrix4();
      rotMat.makeRotationFromQuaternion(qua);
      rotMat.invert();
      const tra = new THREE.Vector4(
        Number(fields[5]),
        Number(fields[6]),
        Number(fields[7]),
        0
      );
      const pos = tra.applyMatrix4(rotMat);

      return {
        imageId: Number(fields[0]),
        quaternion: qua,
        position: new THREE.Vector3(pos.x, pos.y, -pos.z),
      };
    });

  poses.forEach((pose) => {
    const axis = new THREE.AxesHelper(0.5);
    axis.position.copy(pose.position);
    axis.applyQuaternion(pose.quaternion);
    scene.add(axis);
  });
}

function makeProxy() {
  const cameraStructs = poses.map((pose) => ({
    position: new THREE.Vector3(0, 0, 0),
    zDirection: new THREE.Vector3(0, 0, 1)
      .applyQuaternion(pose.quaternion)
      .normalize(),
    color: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
  }));

  proxyMat = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader,
    uniforms: {
      cameras: {
        value: cameraStructs,
      },
    },
  });

  proxy = new THREE.Mesh(proxyGeo, proxyMat);
  scene.add(proxy);
  proxy.scale.y = -1;
  proxy.scale.x = -1;
}
