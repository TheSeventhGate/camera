// main.js

/*******************
**                ** 
** INITILIZATIONS **
**                **
*******************/
import * as THREE from './node_modules/three/build/three.module.js';
import { Camera6DOF } from './Camera6DOF.js';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, 1290 / 1080, 0.1, 1000  );

// For consistant render math 1290 x 1080
const RENDER_WIDTH = 1290;
const RENDER_HEIGHT = 1080;
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

// lines
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
const material = new THREE.MeshBasicMaterial( {color: 0x00ff00, wireframe: true} ); // A mesh is an object that takes a geometry, and applies a material to it
const myObject = new THREE.Mesh( myCone, material ); // The object that combines the shape and appearance and inherits transform behavior from Object3D
//scene.add(myObject);


// camera rig
const cameraRig = new Camera6DOF(scene);



/*******************
**                ** 
** CAMERA         **
**                **
*******************/
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 5;

/*******************
**                ** 
** GAME LOOP      **
**                **
*******************/
function animate( time ) {

  const gp = getGamepad();

  //console.log(gp);

  cameraRig.update(gp); // returns NULL


  renderer.render( scene, camera );

}

renderer.setAnimationLoop(animate);

/*******************
**                ** 
** LISTENERS      **
**                **
*******************/
// code here ....


















/*******************
**                ** 
** NOTES          **
**                **
*******************/
/*


  // lines
  //groupMyLines.rotation.x = time / 3000; // <-- test to see if "grouped"
  //groupMyLines.rotation.y = time / 1000; // <-- test to see if "grouped"

  // shapes and wires
  //cube.rotation.x = time / 2000;
  //cube.rotation.y = time / 1000;







*/