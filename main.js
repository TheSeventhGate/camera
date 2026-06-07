//
//
//       *****************************************************************************
//       **                                                                         **
//       **     All glory to the Creator YHWH and his Son, our King, Jesus Christ   **
//       **                                                                         **
//       *****************************************************************************
//
//
//

// this file: "main.js"



/*******************
**                ** 
** INITILIZATIONS **
**                **
*******************/
//import * as THREE from 'three';
import * as THREE from 'three/webgpu';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Camera6DOF } from './Camera6DOF.js';
import Stats from 'three/addons/libs/stats.module.js'; // <-- no braces needed becuase its a default export
const scene = new THREE.Scene();

// window resolution
let RENDER_WIDTH = window.innerWidth;
let RENDER_HEIGHT = window.innerHeight;

// statistics
const stats = new Stats();
document.body.appendChild(stats.dom);

// camera
const camera = new THREE.PerspectiveCamera( 50, RENDER_WIDTH / RENDER_HEIGHT, 0.1, 1000  );
const renderer = new THREE.WebGPURenderer({ antialias: true });

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
** TIMING         **
**                **
*******************/
let lastTime = 0;
let deltaTime = 0;



/*******************
**                ** 
** GAMEPAD        **
**                **
*******************/
function getGamepad() 
{
  const gamepads = navigator.getGamepads();
  return gamepads[0];
}



/*******************
**                ** 
** WORLD SPACE    **
** WORLD GROUPS   **
**                **
*******************/
const worldGroup = new THREE.Group();
scene.add(worldGroup);

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
//scene.add(groupMyLines);
worldGroup.add(groupMyLines);


// shapes and wires
// Object3D
//  └── Mesh
//       ├── Geometry
//       └── Material
// const myCube = new THREE.BoxGeometry( 1, 1, 1 );
// const myCone = new THREE.ConeGeometry(1, 2, 13);
// const mySphere = new THREE.SphereGeometry(1,13,13);
// const material = new THREE.MeshBasicMaterial({ // A mesh is an object that takes a geometry, and applies a material to it
//       color: 0x00ff00, wireframe: true
// }); 
// const myObject = new THREE.Mesh(myCone, material); // The object that combines the shape and appearance and inherits transform behavior from Object3D
// // scene.add(myObject);

// test surfaces and environmnet
const testSurface = new THREE.PlaneGeometry(100,100);
// const testSurfaceMat = new THREE.MeshStandardMaterial({ // requires a light source
//       color: 0x808080,      // Gray as a hex value
//       side: THREE.DoubleSide,
//       roughness: 0.5,
//       metalness: 0.5
// });
const testSurfaceMat = new THREE.MeshBasicMaterial({
      color: 0x7a7272,      // Gray as a hex value
      side: THREE.DoubleSide,
});
const testSurfaceObj = new THREE.Mesh(testSurface, testSurfaceMat);
//scene.add(testSurfaceObj);
worldGroup.add(testSurfaceObj);


// move the floor down and rotate 90 degrees to be flat
testSurfaceObj.position.y = -2;
testSurfaceObj.rotation.x = -Math.PI / 2;

// test grid matching floor position
const theGrid = new THREE.GridHelper(100, 50, 0x40ecf0, 0x40ecf0);
//scene.add(theGrid);
worldGroup.add(theGrid);
theGrid.position.y = -2;



/*********************
**                  **
** PLAYER + CAMERA  **
**                  **
*********************/
// slaved to 6dof obj --> ALL objects in javascript are passed by reference
const player = new Camera6DOF(scene); // 6dof custom class
player.mountCamera(camera);



/*******************
**                **
** LIGHTING       **
**                **
*******************/
// SCENE (The Global Container)
// │
// ├── worldGroup [MOVES ↔️] (The "Universe" container)
// │   │   // Everything inside here slides in reverse to your inputs
// │   ├── theGrid
// │   ├── testSurfaceObj (The Floor)
// │   ├── groupMyLines (Universe Center Markers)
// │   └── [Planets / Stars / Stations] (Future objects)
// │
// ├── player.origin [ROTATES 🔄] (Fixed at 0, 0, 0)
// │   │   // This is YOUR ship. It never leaves 0,0,0. It only spins.
// │   ├── shipModel (The Mesh)
// │   └── camera [FOLLOWS 🎥] (Rotates with the ship)
// │
// └── shipLights [STATIC 📍] (Fixed at 0, 0, 0 | No Rotation)
//      │   // These live in the Scene. They stay at 0,0,0 but don't spin.
//      ├── shipLight_01
//      ├── shipLight_02
//      └── shipLight_03
// Ship specific lighting (eventually move this to ship obj Camera6DOF.js)
// -10 z seems to be about right bove center fusalage

// ship light 01
const shipLight_01 = new THREE.DirectionalLight(0xffffff, 50.0); // debug red
shipLight_01.position.set(0, 5, -3); // Coming from above and to the side
scene.add(shipLight_01);

// ship light 02
const shipLight_02 = new THREE.DirectionalLight(0xffffff, 25.0); // debug green
shipLight_02.position.set(5, 0, 5); // Coming from above and to the side
scene.add(shipLight_02);

// ship light 03
const shipLight_03 = new THREE.DirectionalLight(0xffffff, 25.0); // debug blue
shipLight_03.position.set(-5, 0, 5); // Coming from above and to the side
scene.add(shipLight_03);

// mesh + mat debugs for lights:
const lightSphereGeo    = new THREE.SphereGeometry(0.5, 8, 8);
const lightSphereMat_01 = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const lightSphereMat_02 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const lightSphereMat_03 = new THREE.MeshBasicMaterial({ color: 0x0000ff });

// visual for Ship Light 01
const shipLight_01_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_01);
shipLight_01_Mesh.position.copy(shipLight_01.position);
//scene.add(shipLight_01_Mesh);

// visual for Ship Light 02
const shipLight_02_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_02);
shipLight_02_Mesh.position.copy(shipLight_02.position);
//scene.add(shipLight_02_Mesh);

// visual for Ship Light 03
const shipLight_03_Mesh = new THREE.Mesh(lightSphereGeo, lightSphereMat_03);
shipLight_03_Mesh.position.copy(shipLight_03.position);
//scene.add(shipLight_03_Mesh);


/*******************
**                ** 
** MAIN GAME LOOP **
**                **
*******************/
function animate( time ) 
{

  // timing... "time" is provided by THREE.js + Canvas's "requestAnimationFrame"
  // delta time iteration
  if (lastTime > 0) {
    deltaTime = (time - lastTime) / 1000; // time in milli since last frame
  }
  lastTime = time;
  
  // delta time 
  const dt = Math.min(deltaTime, 0.1); // The browser is sensitive to postion and size change, this gaurds against the pause
  
  // windows xbox controller
  const gp = getGamepad();

  // player
  player.update(gp, dt); // returns NULL

  // stats
  stats.update();

  // here i am moving the world not the player
  // .negate() turns (0, 0, 10) into (0, 0, -10)
   worldGroup.position.copy(player.position).negate();

  // renderer
  renderer.render( scene, camera );

}

// main game loop call
renderer.setAnimationLoop(animate);

// diagnostic: confirm WebGPU is active
renderer.init().then(() => {
    const isWebGPU = renderer.isWebGPURenderer;
    console.log("Is WebGPU Active:", isWebGPU);
    console.log("Renderer Type:", renderer.constructor.name);
});




















