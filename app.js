// import * as THREE from './node_modules/three/build/three.module.js';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import Delaunator from './vendor/delaunator.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
const renderer = new THREE.WebGLRenderer();

const planeGeo = new THREE.BufferGeometry();
let imagePlane;

const MAX_POINTS = 5000;
const gridSize = 7;
const planeIsWireframe = false;
const planeZ = -1;
const planePositions = new Float32Array(MAX_POINTS);
const positionAttribute = new THREE.BufferAttribute(planePositions, 3);
positionAttribute.usage = THREE.DynamicDrawUsage;

const planeIndices = new Uint32Array(MAX_POINTS);
const indexAttribute = new THREE.BufferAttribute(planeIndices, 3);
indexAttribute.usage = THREE.DynamicDrawUsage;

const proxyGeo = new THREE.PlaneGeometry(21, 21, 11, 11);
const proxyMat = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});
const proxy = new THREE.Mesh(proxyGeo, proxyMat);
const proxyVertices = []; // used for projecting the vertices of the geometry
// assume no dynamic vertices for now

let fragmentShader, vertexShader;
let blendMat;

let poses;
const worldAxis = new THREE.AxesHelper(0.1);

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, -10);
camera.lookAt(new THREE.Vector3());

scene.add(camera, worldAxis, proxy);
proxy.position.z = 10;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target = new THREE.Vector3(0, 0, 0);
controls.panSpeed = 2;

controls.addEventListener('change', () => {
  imagePlane && updateImagePlaneGeo();
});

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
  await loadShaders();
  buildImagePlane();
  updateImagePlaneGeo();
  animate();
}

async function loadShaders() {
  vertexShader = await fetch('./vertex.glsl').then((res) => res.text());
  fragmentShader = await fetch('./fragment.glsl').then((res) => res.text());
  console.log('Loaded shaders');
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
    const ah = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(),
      4,
      0x0000ff
    );
    axis.add(ah);
  });
}

function buildImagePlane() {
  planeGeo.setAttribute('position', positionAttribute);
  planeGeo.index = indexAttribute;

  const cameraStructs = poses.map((pose) => ({
    position: new THREE.Vector3(0, 0, 0),
    color: new THREE.Vector3(Math.random(), Math.random(), Math.random()),
  }));

  blendMat = new THREE.ShaderMaterial({
    fragmentShader,
    vertexShader,
    transparent: true,
    wireframe: planeIsWireframe,
    uniforms: {
      cameras: {
        value: cameraStructs,
      },
    },
  });

  blendMat.side = THREE.BackSide;

  imagePlane = new THREE.Mesh(planeGeo, blendMat);
  camera.add(imagePlane);
  imagePlane.position.z = planeZ;
}

function updateImagePlaneGeo() {
  const { aspect, fov } = camera;
  const height = 2 * Math.tan((Math.PI / 180) * fov * 0.5);
  const width = height * aspect;
  const points = [];
  const imagePlaneScale = new THREE.Vector3(width / 2, height / 2, 0);

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const newPt = new THREE.Vector3(
        (i / gridSize) * width - width / 2,
        (j / gridSize) * height - height / 2,
        0
      );
      points.push(newPt);
    }
  }

  poses.forEach((pose, poseIndex) => {
    let posePos = pose.position.clone();
    posePos.project(camera);
    posePos.multiply(imagePlaneScale);
    points.push(posePos);
    // update existing cameraStructs - assumes pose order has not changed
    blendMat.uniforms.cameras.value[poseIndex].position = posePos;
  });

  // project proxy to plane
  if (!proxyVertices.length) {
    const proxyPositions = proxyGeo.getAttribute('position');
    for (
      let i = 0;
      i < proxyPositions.array.length;
      i += proxyPositions.itemSize
    ) {
      const proxyVertex = new THREE.Vector3(
        ...proxyPositions.array.slice(i, i + proxyPositions.itemSize)
      );
      proxyVertices.push(proxyVertex);
    }
  }

  proxyVertices.forEach((proxyVertex) => {
    let vertex = proxyVertex.clone();
    vertex.applyMatrix4(proxy.matrixWorld);
    vertex.project(camera);
    vertex.multiply(imagePlaneScale);
    points.push(vertex);
  });

  planePositions.fill(0);
  planePositions.set(
    points.reduce((acc, pt) => [...acc, pt.x, pt.y, pt.z], []),
    0
  );
  planeGeo.attributes.position.needsUpdate = true;

  const delaunay = Delaunator.from(points.map((pt) => [pt.x, pt.y]));
  const meshIndex = [];
  for (let i = 0; i < delaunay.triangles.length; i++) {
    meshIndex.push(delaunay.triangles[i]);
  }

  planeIndices.fill(0);
  planeIndices.set(meshIndex, 0);
  planeGeo.index.needsUpdate = true;

  planeGeo.computeVertexNormals();
}
