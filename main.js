// main.js

/*
$tree
  ├── main.js
  ├── node_modules
  ├── package-lock.json
  ├── package.json
  └── public

  directory: 2 file: 4
*/


// setup
import * as THREE from './node_modules/three/build/three.module.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } ); // A mesh is an object that takes a geometry, and applies a material to it
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

// render loop
function animate( time ) {

  cube.rotation.x = time / 2000;
  cube.rotation.y = time / 1000;

  renderer.render( scene, camera );

}

// event listners
window.addEventListener('resize', () => { //"arrow function" -- “here is a function (as a value) that should be called later when resize happens”
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});