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

// window resolution
let RENDER_WIDTH = window.innerWidth;
let RENDER_HEIGHT = window.innerHeight;

// camera
const camera = new THREE.PerspectiveCamera( 50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000  );
const renderer = new THREE.WebGLRenderer();

// opengl render buffer is fixed size + handle html dom margins
renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
document.body.style.margin = "0";
document.body.style.overflow = "auto";
renderer.domElement.style.width = RENDER_WIDTH;
renderer.domElement.style.height = RENDER_HEIGHT;
renderer.setPixelRatio(1); // Force rendering to use a 1:1 pixel scale so graphics math behaves consistently across different monitors and DPI settings
document.body.style.margin = "0";
document.body.appendChild(renderer.domElement);

// event listner incase the above resolutions + window size changes due to user altering the window sizes
window.addEventListener('resize', () => {

  // update local width/height variables
  RENDER_WIDTH = window.innerWidth;
  RENDER_HEIGHT = window.innerHeight;

  // update the camera aspect ratio
  camera.aspect = RENDER_WIDTH / RENDER_HEIGHT;
  camera.updateProjectionMatrix(); // <-- critical: Forces the camera to recalculate its math

  // update the OpenGL Render Buffer
  // this resizes the actual "drawing surface"
  renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);

  // update the Canvas CSS (The visual container)
  renderer.domElement.style.width = RENDER_WIDTH + 'px';
  renderer.domElement.style.height = RENDER_HEIGHT + 'px';

});


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
** LIGHTS         **
**                **
*******************/
// Space lights / general lighting
const sunLight = new THREE.PointLight(0xffffff, 500.0); // Bright white light
sunLight.position.set(0, 200, 0); // Coming from above and to the side
scene.add(sunLight);
const sunGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Bright Yellow
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.copy(sunLight.position);
scene.add(sunMesh);

// Ship specific lighting (eventually move this to ship obj Camera6DOF.js)
// -10 z seems to be about right bove center fusalage
const shipLight_01 = new THREE.DirectionalLight(0xffffff, 5.0); // debug red
shipLight_01.position.set(0, 10, -10); // Coming from above and to the side
scene.add(shipLight_01);

const shipLight_02 = new THREE.DirectionalLight(0xffffff, 5.0); // debug green
shipLight_02.position.set(-10, -10, 10); // Coming from above and to the side
scene.add(shipLight_02);

const shipLight_03 = new THREE.DirectionalLight(0xffffff, 5.0); // debug blue
shipLight_03.position.set(10, 10, 10); // Coming from above and to the side
scene.add(shipLight_03);

// debug and visualize where the above lights are:
const lightSphereGeo = new THREE.SphereGeometry(0.5, 8, 8);
const lightSphereMat_01 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const lightSphereMat_02 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const lightSphereMat_03 = new THREE.MeshBasicMaterial({ color: 0x0000ff });


// visual for Ship Light 01
const shipLight_01_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_01);
shipLight_01_Mesh.position.copy(shipLight_01.position);
scene.add(shipLight_01_Mesh);

// visual for Ship Light 02
const shipLight_02_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_02);
shipLight_02_Mesh.position.copy(shipLight_02.position);
scene.add(shipLight_02_Mesh);

// visual for Ship Light 03
const shipLight_03_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_03);
shipLight_03_Mesh.position.copy(shipLight_03.position);
scene.add(shipLight_03_Mesh);




/*******************
**                ** 
** MAIN GAME LOOP **
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




















