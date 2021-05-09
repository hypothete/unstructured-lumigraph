// import * as THREE from './node_modules/three/build/three.module.js';
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import Delaunator from './vendor/delaunator.js';

const scene = new THREE.Scene();
let width = window.innerWidth;
let height = window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 100);
const renderer = new THREE.WebGLRenderer();
let fragmentShader, vertexShader;

const planeGeo = new THREE.BufferGeometry();
const planeMat = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xffff00 });
let imagePlane;

const MAX_POINTS = 300;
const planePositions = new Float32Array(MAX_POINTS * 3);
const positionAttribute = new THREE.BufferAttribute(planePositions, 3);
positionAttribute.dynamic = true;

const planeIndices = new Uint16Array(MAX_POINTS * 3);
const indexAttribute = new THREE.BufferAttribute(planeIndices, 3);
indexAttribute.dynamic = true;

let poses;
const worldAxis = new THREE.AxesHelper(0.1);

renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, -10);
camera.lookAt(new THREE.Vector3());

scene.add(camera, worldAxis);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target = new THREE.Vector3(0,0,0);
controls.panSpeed = 2;

controls.addEventListener('change', () => {
  imagePlane && updateImagePlaneGeo();
})

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
    axis.applyQuaternion(pose.quaternion)
    scene.add(axis);
    const ah = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 4, 0x0000ff);
    axis.add(ah);
  });
}

function buildImagePlane() {
  planeGeo.setAttribute('position', positionAttribute);
  planeGeo.index = indexAttribute;
  imagePlane = new THREE.Mesh(planeGeo, planeMat);
  camera.add(imagePlane);
  imagePlane.position.z = -1;
}

function updateImagePlaneGeo() {
  const { aspect, fov } = camera;
  const height = 2 * Math.tan((Math.PI / 180) * fov * 0.5);
  const width = height * aspect;
  const points = [];

  for(let i=0; i<=10; i++) {
    for (let j=0; j<=10; j++) {
      const newPt = new THREE.Vector3(
        (i /10) * width - width/2,
        (j /10) * height - height/2, 0);
      points.push(newPt);
    }
  }

  poses.forEach(pose => {
    let posePos = pose.position.clone();
    posePos.project(camera);
    posePos.multiply(new THREE.Vector3(width / 2, height / 2, 0));
    points.push(posePos);
  });

  planePositions.fill(0);
  planePositions.set(points.reduce((acc, pt) => ([...acc, pt.x, pt.y, pt.z]), []), 0);
  planeGeo.attributes.position.needsUpdate = true;

  const delaunay = Delaunator.from(points.map(pt => ([pt.x, pt.y])));
  const meshIndex = [];
  for(let i=0; i<delaunay.triangles.length; i++) {
    meshIndex.push(delaunay.triangles[i]);
  }

  planeIndices.fill(0);
  planeIndices.set(meshIndex, 0);
  planeGeo.index.needsUpdate = true;

  planeGeo.computeVertexNormals();
}
