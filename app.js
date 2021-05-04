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
const planeIndices = new Float32Array(MAX_POINTS * 3);

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
  planeGeo.setAttribute('position', new THREE.BufferAttribute(planePositions, 3));
  planeGeo.setAttribute('index', new THREE.BufferAttribute(planeIndices, 3));
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
      points.push(new THREE.Vector3(
        (i /10) * width - width/2,
        (j /10) * height - height/2, 0));
    }
  }

  poses.forEach(pose => {
    let posePos = pose.position.clone();
    posePos.project(camera);
    posePos.multiply(new THREE.Vector3(width / 2, height / 2, 0));
    points.push(posePos);
  });

  let index = 0;
  for(let i=0; i< points.length; i++) {
    planeGeo.attributes.position.array[index++] = points[i].x;
    planeGeo.attributes.position.array[index++] = points[i].y;
    planeGeo.attributes.position.array[index++] = points[i].z;
  }
  planeGeo.attributes.position.needsUpdate = true;

  const delaunay = Delaunator.from(points.map(pt => ([pt.x, pt.y])));
  const meshIndex = [];
  for(let i=0; i<delaunay.triangles.length; i++) {
    meshIndex.push(delaunay.triangles[i]);
  }

  index = 0;
  for(let i=0; i < meshIndex.length; i ++) {
    planeGeo.attributes.index.array[index++] = meshIndex[i];
  }
  planeGeo.attributes.index.needsUpdate = true;

  planeGeo.computeVertexNormals();
}
