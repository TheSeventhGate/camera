// main.js

/*******************
**                ** 
** INITILIZATIONS **
**                **
*******************/
import * as THREE from './node_modules/three/build/three.module.js';

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
** SCENE OBJECTS  **
**                **
*******************/

// lines
const myLineArray = [
  new THREE.Vector3(0,0,0), // start
  new THREE.Vector3(0,1,0)  // end
]; 
const myLine = new THREE.BufferGeometry().setFromPoints(myLineArray);
const lineMaterial = new THREE.MeshBasicMaterial( {color: 0x00ff00, wireframe: true} ); 
const line = new THREE.Line(myLine, lineMaterial);
scene.add(line);

// shapes and wires
// Object3D
//  └── Mesh
//       ├── Geometry
//       └── Material
const myCube = new THREE.BoxGeometry( 1, 1, 1 );
const myCone = new THREE.ConeGeometry(1, 2, 4);
const mySphere = new THREE.SphereGeometry(1,13,13);
const material = new THREE.MeshBasicMaterial( {color: 0x00ff00, wireframe: true} ); // A mesh is an object that takes a geometry, and applies a material to it
const cube = new THREE.Mesh( myCube, material ); // The object that combines the shape and appearance and inherits transform behavior from Object3D
scene.add( cube );

// camera
camera.position.z = 10;

/*******************
**                ** 
** GAME LOOP      **
**                **
*******************/
function animate( time ) {

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;
  renderer.render( scene, camera );

}

renderer.setAnimationLoop(animate);

/*******************
**                ** 
** LISTENERS      **
**                **
*******************/
// code here ....

