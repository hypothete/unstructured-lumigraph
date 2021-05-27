// import * as THREE from './node_modules/three/build/three.module.js';
import * as THREE from './vendor/three.module.js';
import { OBJLoader } from './vendor/OBJLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const DATA_FOLDER = 'cube';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width / height, 0.001, 1000);
const renderer = new THREE.WebGLRenderer();
let proxyGeo, proxyMat, proxy;
let fragmentShader, vertexShader;
let resX, resY;
const filenames = [];
let imageTexture;
let poses;
let showCameraHelpers = false;
const cameraHelpers = [];

// mode 0 = lumigraph rendering
// mode 1 = blending field
// mode 2 = show proxy normals
let shaderMode = 0;

// spread out cameras across a plane to check projection
let proxyIsPlane = false;

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, -20);
camera.lookAt(new THREE.Vector3(0, 0, 1000));
scene.add(camera);

// const worldAxis = new THREE.AxesHelper(20);
// scene.add(worldAxis);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target = new THREE.Vector3(0, 0, 0);
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
      break;
    case 'm':
      shaderMode = (shaderMode + 1) % 3;
      proxyMat.uniforms.mode.value = shaderMode;
      proxyMat.needsUpdate = true;
      break;
    default:
  }
});

loadScene();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

async function loadScene() {
  await loadImageData();
  await loadImageTexture();
  await loadGeometry();
  await loadShaders();
  makeProxy();
  console.log('Scene loaded!');
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then((res) => res.text());
  fragmentShader = await fetch('./fragment.glsl').then((res) => res.text());
  console.log('Loaded shaders');
}

async function loadGeometry() {
  if (proxyIsPlane) {
    proxyGeo = new THREE.PlaneBufferGeometry(50, 50, 51, 51);
    console.log('loaded geometry');
    return;
  }

  return new Promise((res) => {
    const loader = new OBJLoader();
    loader.load(`data/${DATA_FOLDER}/proxy.obj`, (proxyObj) => {
      proxyGeo = proxyObj.children[0].geometry.clone();
      console.log('loaded geometry');
      res();
    });
  });
}

function getColor(index) {
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
  return colors[index % colors.length];
}

async function loadImageData() {
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

      if (proxyIsPlane) {
        position.x *= 5;
        position.y *= 5;
      }

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
      mode: {
        value: 0,
      },
    },
  });

  proxy = new THREE.Mesh(proxyGeo, proxyMat);
  scene.add(proxy);

  // proxy scale and position adjustment
  if (proxyIsPlane) {
    proxy.position.z = 6;
    proxy.rotation.y = Math.PI;
  } else {
    proxy.scale.x = -1;
    proxy.scale.y = -1;
  }

  console.log('Proxy loaded');
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

async function loadImageTexture() {
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
  imageTexture = new THREE.DataTexture2DArray(
    allBuffer,
    resX,
    resY,
    poses.length
  );
  console.log('Loaded images into texture');
}
