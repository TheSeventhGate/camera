// main.js

/*******************
**                ** 
** INITILIZATIONS **
**                **
*******************/
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Camera6DOF } from './Camera6DOF.js';
const scene = new THREE.Scene();

// Basic Lighting (Required to see non-wireframe objects)
const light = new THREE.AmbientLight( 0xffffff, 1.0 ); 
scene.add( light );

// for consistant render math 1290 x 1080
const RENDER_WIDTH = 1290;
const RENDER_HEIGHT = 1080;
const camera = new THREE.PerspectiveCamera( 50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000  );
const renderer = new THREE.WebGLRenderer();

// render buffer is fixed size
renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
document.body.style.margin = "0";
document.body.style.overflow = "auto";
renderer.domElement.style.width = "1290px";
renderer.domElement.style.height = "1080px";
renderer.setPixelRatio(1); // Force rendering to use a 1:1 pixel scale so graphics math behaves consistently across different monitors and DPI settings
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

/*******************
**                **
** TIME           **
**                **
*******************/
let lastTime = 0;
let deltaTime = 0;


/*******************
**                ** 
** GAMEPAD        **
**                **
*******************/
function getGamepad() {
  const gamepads = navigator.getGamepads();
  return gamepads[0];
}

/*******************
**                ** 
** SCENE OBJECTS  **
**                **
*******************/

// axis lines
// scene
//  ├── groupMyLines (HAS transform)
//  │    ├── lineX
//  │    ├── lineY
//  │    └── lineZ
//  └── cube
const positiveX = [
  new THREE.Vector3(0,0,0), // start
  new THREE.Vector3(1,0,0)  // end
];
const positiveY = [
  new THREE.Vector3(0,0,0), // start
  new THREE.Vector3(0,1,0)  // end
]; 
const positiveZ = [
  new THREE.Vector3(0,0,0), // start
  new THREE.Vector3(0,0,1)  // end
];  
const worldX = new THREE.BufferGeometry().setFromPoints(positiveX);
const worldY = new THREE.BufferGeometry().setFromPoints(positiveY);
const worldZ = new THREE.BufferGeometry().setFromPoints(positiveZ);

const lineMaterialX = new THREE.LineBasicMaterial({ color: 0xff0000 });
const lineMaterialY = new THREE.LineBasicMaterial({ color: 0x00ff00 });
const lineMaterialZ = new THREE.LineBasicMaterial({ color: 0x0000ff });

const lineX = new THREE.Line(worldX, lineMaterialX);
const lineY = new THREE.Line(worldY, lineMaterialY);
const lineZ = new THREE.Line(worldZ, lineMaterialZ);

const groupMyLines = new THREE.Group();
groupMyLines.add(lineX);
groupMyLines.add(lineY);
groupMyLines.add(lineZ);
scene.add(groupMyLines);

// shapes and wires
// Object3D
//  └── Mesh
//       ├── Geometry
//       └── Material
const myCube = new THREE.BoxGeometry( 1, 1, 1 );
const myCone = new THREE.ConeGeometry(1, 2, 13);
const mySphere = new THREE.SphereGeometry(1,13,13);
const material = new THREE.MeshBasicMaterial({ // A mesh is an object that takes a geometry, and applies a material to it
      color: 0x00ff00, wireframe: true
}); 
const myObject = new THREE.Mesh(myCone, material); // The object that combines the shape and appearance and inherits transform behavior from Object3D
// scene.add(myObject);

// world
const testSurface = new THREE.PlaneGeometry(100,100);
// const testSurfaceMat = new THREE.MeshStandardMaterial({ // requires a light source
//       color: 0x808080,      // Gray as a hex value
//       side: THREE.DoubleSide,
//       roughness: 0.5,
//       metalness: 0.5
// });
const testSurfaceMat = new THREE.MeshBasicMaterial({
      color: 0x808080,      // Gray as a hex value
      side: THREE.DoubleSide,
});
const testSurfaceObj = new THREE.Mesh(testSurface, testSurfaceMat);
// scene.add(testSurfaceObj);

// move the floor down and rotate 90 degrees to be flat
testSurfaceObj.position.y = -2;
testSurfaceObj.rotation.x = -Math.PI / 2;

// test grid
const theGrid = new THREE.GridHelper(100, 50, 0x40ecf0, 0x40ecf0);
scene.add(theGrid);
theGrid.position.y = -2;

/*******************
**                **
** CAMERA         **
**                **
*******************/
// slaved to 6dof obj --> ALL objects in javascript are passed by reference
const cameraRig = new Camera6DOF(scene); // 6dof custom class
cameraRig.mountCamera(camera);

/*******************
**                ** 
** GAME LOOP      **
**                **
*******************/
function animate( time ) {

  // timing... "time" is provided by THREE.js + Canvas's "requestAnimationFrame"
  if (lastTime > 0) {
    deltaTime = (time - lastTime) / 1000; // time in milli since last frame
  }
  lastTime = time;
  const dt = Math.min(deltaTime, 0.1); // The browser is sensitive to postion and size change, this gaurds against the pause
  
  const gp = getGamepad();

  cameraRig.update(gp, dt); // returns NULL

  renderer.render( scene, camera );

}

// main game loop call
renderer.setAnimationLoop(animate);




















