// import * as THREE from './node_modules/three/build/three.module.js';
import * as THREE from './vendor/three.module.js';
import { OBJLoader } from './vendor/OBJLoader.js';
// import { OrbitControls } from './vendor/OrbitControls.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
let mousedown = false;
let proxyGeo, proxyMat, proxy;
let fragmentShader, vertexShader;
let resX, resY;
const filenames = [];
let imageTexture;
let poses;

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, 5);
camera.lookAt(new THREE.Vector3(0, 0, 1000));
scene.add(camera);

// const controls = new OrbitControls(camera, renderer.domElement);

// controls.target = new THREE.Vector3(0, 0, 0);
// controls.panSpeed = 2;
// controls.enableDamping = true;

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.render(scene, camera);
});

window.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'a':
      camera.position.x += 0.1;
      break;
    case 'd':
      camera.position.x -= 0.1;
      break;
    case 'w':
      camera.position.y += 0.1;
      break;
    case 's':
      camera.position.y -= 0.1;
      break;
    case 'q':
      camera.position.z += 0.5;
      break;
    case 'z':
      camera.position.z -= 0.5;
      break;
    default:
  }
});

renderer.domElement.addEventListener('mousedown', () => {
  mousedown = true;
});

renderer.domElement.addEventListener('mouseup', () => {
  mousedown = false;
});

renderer.domElement.addEventListener('mousemove', (e) => {
  e.preventDefault();
  if (!mousedown) return;
  camera.position.x += e.movementX / 100;
  camera.position.y += e.movementY / 100;
});

loadScene();

function animate() {
  requestAnimationFrame(animate);
  // controls.update();
  renderer.render(scene, camera);
}

async function loadScene() {
  await loadImageData();
  await loadImageTexture();
  await loadGeometry();
  await loadShaders();
  makeProxy();
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex2.glsl').then((res) => res.text());
  fragmentShader = await fetch('./fragment2.glsl').then((res) => res.text());
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

function getColor(index) {
  // TODO generate based on index
  // used to have fixed colors to ensure blending field is working
  const colors = [
    [0.0, 1.0, 1.0],
    [1.0, 1.0, 0.0],
    [1.0, 0.0, 1.0],
    [1.0, 0.0, 0.0],
    [1.0, 0.7, 1.0],
    [0.7, 1.0, 0.0],
    [0.0, 0.0, 0.7],
    [0.3, 0.3, 0.0],
    [0.3, 0.7, 1.0],
    [0.0, 1.0, 0.0],
    [0.0, 0.0, 1.0],
    [0.3, 0.0, 0.7],
    [0.5, 0.5, 0.5],
  ];
  return colors[index];
}

async function loadImageData() {
  const rawImgText = await fetch('./data/images.txt').then((res) => res.text());
  poses = rawImgText
    .split(`\r\n`)
    .filter((line) => {
      return line.endsWith('jpg');
    })
    .map((line) => {
      const fields = line.split(' ');
      filenames.push(fields[fields.length - 1]);
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

  const rawCameraText = await fetch('./data/cameras.txt').then((res) =>
    res.text()
  );

  rawCameraText
    .split(`\r\n`)
    .filter((line) => {
      return line.length > 2 && !line.startsWith('#');
    })
    .forEach((line, lineIndex) => {
      const fields = line.split(' ').map(Number);
      const camIndex = fields[0] - 1;
      if (lineIndex === 0) {
        // get resolution
        resX = fields[2];
        resY = fields[3];
      }
      // vertical fov
      poses[camIndex].fov =
        (180 * 2 * Math.atan(fields[3] / (2 * fields[4]))) / Math.PI;
      poses[camIndex].aspect = Number(fields[2] / fields[3]);
    });

  // get mvpMatrix for each camera
  poses.forEach((pose) => {
    const tempCamera = new THREE.PerspectiveCamera(
      pose.fov,
      pose.aspect,
      0.01,
      100
    );
    tempCamera.position.copy(pose.position);
    tempCamera.applyQuaternion(pose.quaternion);
    tempCamera.updateMatrixWorld(true);
    tempCamera.rotation.y += Math.PI;

    tempCamera.updateMatrixWorld(true);
    pose.mvpMatrix = new THREE.Matrix4();
    pose.mvpMatrix.multiplyMatrices(
      tempCamera.projectionMatrix,
      tempCamera.matrixWorldInverse
    );

    // set up helpers in the scene for the cameras

    // const axis = new THREE.AxesHelper(0.5);
    // axis.position.copy(pose.position);
    // axis.applyQuaternion(pose.quaternion);
    // scene.add(axis);

    // const helper = new THREE.CameraHelper(tempCamera);
    // scene.add(helper);
  });

  console.log('Loaded image and camera data');
}

function makeProxy() {
  const cameraStructs = poses.map((pose, poseIndex) => ({
    position: pose.position,
    color: new THREE.Vector3(...getColor(poseIndex)),
    matrix: pose.mvpMatrix,
  }));

  proxyMat = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader,
    uniforms: {
      cameras: {
        value: cameraStructs,
      },
      images: { value: imageTexture },
    },
  });

  proxy = new THREE.Mesh(proxyGeo, proxyMat);
  scene.add(proxy);
  proxy.scale.y = -1;
  proxy.scale.x = -1;
}

function imgToRGBABuffer(img, w, h) {
  const can = document.createElement('canvas');
  const ctx = can.getContext('2d');
  can.width = w;
  can.height = h;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  return imgData.data;
}

async function loadImageTexture() {
  const textureLoader = new THREE.TextureLoader();
  const bufferTx = await Promise.all(
    filenames.map(async (filename) => {
      const loadedTx = await textureLoader.loadAsync(
        `./data/images/${filename}`
      );
      return imgToRGBABuffer(loadedTx.image, resX, resY);
    })
  );
  const totalBytes = bufferTx.reduce((acc, buf) => acc + buf.byteLength, 0);
  const allBuffer = new Uint8Array(totalBytes);
  let offset = 0;
  bufferTx.forEach((buf) => {
    allBuffer.set(buf, offset);
    offset += buf.byteLength;
  });
  imageTexture = new THREE.DataTexture2DArray(
    allBuffer,
    resX,
    resY,
    poses.length
  );
  console.log('Loaded images into texture');
}
