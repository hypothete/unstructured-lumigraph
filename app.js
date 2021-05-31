import * as THREE from './vendor/three.module.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const searchParam = new URLSearchParams(window.location.search);
const loadWrap = document.querySelector('#load-wrap');
const showControls = document.querySelector('#show-controls');
const ctrlDesc = document.querySelector('#ctrl-desc');
const DATA_FOLDER = searchParam.get('model') || 'cube';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
const renderer = new THREE.WebGLRenderer();
let proxyGeo, proxyMat, proxy;
let fragmentShader, vertexShader;
let resX, resY;
const filenames = [];
let cameraImageArray;
let poses;
let showCameraHelpers = false;
const cameraHelpers = [];

// mode 0 = lumigraph rendering
// mode 1 = blending field
// mode 2 = show proxy normals
let shaderMode = 0;

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, -20);

if (DATA_FOLDER === 'statue' || DATA_FOLDER === 'kettle') {
  camera.up = new THREE.Vector3(1, 0, 0);
}

camera.lookAt(new THREE.Vector3(0, 0, 1000));
scene.add(camera);

const worldAxis = new THREE.AxesHelper(20);
worldAxis.visible = showCameraHelpers;
scene.add(worldAxis);

const controls = new OrbitControls(camera, renderer.domElement);
if (DATA_FOLDER === 'statue') {
  controls.target = new THREE.Vector3(0, 3.5, 5);
} else if (DATA_FOLDER === 'kettle') {
  controls.target = new THREE.Vector3(0, 0, 17);
} else {
  controls.target = new THREE.Vector3(0, 0, 0);
}

controls.panSpeed = 2;
controls.enableDamping = true;

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
    case 'c':
      showCameraHelpers = !showCameraHelpers;
      cameraHelpers.forEach((helper) => {
        helper.visible = showCameraHelpers;
      });
      worldAxis.visible = showCameraHelpers;
      break;
    case 'm':
      shaderMode = (shaderMode + 1) % 3;
      proxyMat.uniforms.mode.value = shaderMode;
      proxyMat.needsUpdate = true;
      break;
    default:
  }
});

showControls.addEventListener('input', () => {
  ctrlDesc.classList.toggle('hidden');
});

loadScene();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadScene() {
  await loadPoses();
  await loadCameraImageArray();
  await loadGeometry();
  await loadShaders();
  makeProxy();
  console.log('Scene loaded!');
  loadWrap.style.display = 'none';
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then((res) => res.text());
  fragmentShader = await fetch('./fragment.glsl').then((res) => res.text());
  console.log('Loaded shaders');
}

async function loadGeometry() {
  if (DATA_FOLDER === 'statue') {
    proxyGeo = new THREE.CylinderBufferGeometry(2.2, 2.2, 8, 120, 60, false);
  } else if (DATA_FOLDER === 'kettle') {
    proxyGeo = new THREE.PlaneBufferGeometry(40, 30, 120, 90);
  } else {
    await new Promise((res) => {
      const loader = new OBJLoader();
      loader.load(`data/${DATA_FOLDER}/proxy.obj`, (proxyObj) => {
        proxyGeo = proxyObj.children[0].geometry.clone();
        res();
      });
    });
  }

  console.log('loaded geometry');
}

function getColor(index) {
  // provides colors for cameras when visualizing the blending field
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
  return colors[index % colors.length];
}

async function loadPoses() {
  const rawImgText = await fetch(`./data/${DATA_FOLDER}/images.txt`).then(
    (res) => res.text()
  );
  poses = rawImgText
    .split(`\r\n`)
    .filter((line) => {
      return line.toLocaleLowerCase().endsWith('jpg');
    })
    .map((line) => {
      const fields = line.split(' ');
      filenames.push(fields[fields.length - 1]);
      const quaternion = new THREE.Quaternion(
        Number(fields[2]),
        Number(fields[3]),
        Number(fields[4]),
        Number(fields[1])
      );

      const rotMat = new THREE.Matrix4();
      rotMat.makeRotationFromQuaternion(quaternion);
      rotMat.invert();

      const translation = new THREE.Vector3(
        Number(fields[5]),
        Number(fields[6]),
        Number(fields[7])
      );
      const position = translation.applyMatrix4(rotMat);
      position.z *= -1;

      return {
        imageId: Number(fields[0]),
        quaternion,
        position,
      };
    });

  const rawCameraText = await fetch(`./data/${DATA_FOLDER}/cameras.txt`).then(
    (res) => res.text()
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
    const poseCamera = new THREE.PerspectiveCamera(
      pose.fov,
      pose.aspect,
      0.01,
      30
    );
    poseCamera.position.copy(pose.position);
    poseCamera.applyQuaternion(pose.quaternion);

    // this appears necessary translating COLMAP coordinates to THREE.js
    poseCamera.rotation.y += Math.PI;
    poseCamera.scale.x = -1;
    poseCamera.scale.y = -1;

    poseCamera.updateMatrixWorld(true);
    pose.mvpMatrix = new THREE.Matrix4();
    pose.mvpMatrix.multiplyMatrices(
      poseCamera.projectionMatrix,
      poseCamera.matrixWorldInverse
    );
    scene.add(poseCamera);

    // set up helpers in the scene for the cameras
    const axis = new THREE.AxesHelper(0.2);
    poseCamera.add(axis);

    const helper = new THREE.CameraHelper(poseCamera);
    helper.visible = showCameraHelpers;
    cameraHelpers.push(helper);
    scene.add(helper);
  });

  console.log('Loaded camera poses');
}

function imgToRGBABuffer(img, w, h) {
  const can = document.createElement('canvas');
  const ctx = can.getContext('2d');
  can.width = w;
  can.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  return imgData.data;
}

async function loadCameraImageArray() {
  const textureLoader = new THREE.TextureLoader();
  const bufferTx = await Promise.all(
    filenames.map(async (filename) => {
      const loadedTx = await textureLoader.loadAsync(
        `./data/${DATA_FOLDER}/images/${filename}`
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
  cameraImageArray = new THREE.DataTexture2DArray(
    allBuffer,
    resX,
    resY,
    poses.length
  );
  console.log('Loaded images into texture');
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
    defines: {
      CAMERA_COUNT: cameraStructs.length,
      CLOSEST_K: 4,
      RES_WEIGHT: 0.0,
    },
    uniforms: {
      cameras: {
        value: cameraStructs,
      },
      images: { value: cameraImageArray },
      mode: {
        value: 0,
      },
    },
  });

  proxy = new THREE.Mesh(proxyGeo, proxyMat);
  scene.add(proxy);

  // proxy scale and position adjustment
  if (DATA_FOLDER === 'statue') {
    proxy.rotation.z = Math.PI / 2;
    proxy.position.z += 4;
    proxy.position.y += 3.5;
  } else if (DATA_FOLDER === 'kettle') {
    proxy.rotation.y = Math.PI;
    proxy.position.z += 17;
  } else {
    proxy.scale.x = -1;
    proxy.scale.y = -1;
  }

  console.log('Proxy loaded');
}
