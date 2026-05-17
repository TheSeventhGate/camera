// this file: "Camera6DOF.js"
//import { Quaternion } from 'three/src/Three.Core.js';
import * as THREE from './node_modules/three/build/three.module.js';

// axes[0] → left stick X (strafe)
// axes[1] → left stick Y (forward/back)
// axes[2] → right stick X (yaw)
// axes[3] → right stick Y (pitch)

export class Camera6DOF 
{
    constructor(scene)
    {

        // Origin root in relation to world space
        this.origin = new THREE.Object3D();
        scene.add(this.origin);

        // Positioning and Rotations in relation to origin
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Quaternion();

        // Visual model in relation to root above (can be considered local space)
        this.shape = new THREE.ConeGeometry(1,2,13);
        this.mat   = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
        this.mesh  = new THREE.Mesh(this.shape, this.mat);
 
        // Offset of visual model (mesh != origin)
        this.mesh.rotation.x = Math.PI / 2;

        // Attach the mesh as a child of the origin
        this.origin.add(this.mesh);
        
    }

    // Attach a camera to the rig
    mountCamera(camera)
    {
        this.camera = camera;
        this.origin.add(this.camera);
        
        // Reset local position
        this.camera.position.set(0, 0, 0);
        
        // Rig forward is +Z (where the cone apex points).
        // Camera default is -Z. Rotate 180 (PI) to align.
        this.camera.rotation.set(0, 0, 0);
    }

    // Translates method
    translate(gp)
    {
        // Input
        if (!gp) return;
        const accelInput = gp.axes[1];

        // Acceleration
        const forwardVector = new THREE.Vector3(0,0,1);
        forwardVector.applyQuaternion(this.rotation);
        this.position.add(forwardVector.multiplyScalar(accelInput * 0.05));

        // Strafe


    }

    // Rotations method
    rotate(gp)
    {
        // Inputs
        if (!gp) return;
        const yawInput = gp.axes[2];
        const pitchInput = gp.axes[3];

        // Yaw (Global)
        const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -yawInput * 0.05);
        this.rotation.premultiply(yawQuaternion);

        // Pitch (Local)
        const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -pitchInput * 0.05);
        this.rotation.multiply(pitchQuaternion);

        // Roll

    }

    // Update/Draw method
    update(gp)
    {
        // Call these every frame
        this.translate(gp); 
        this.rotate(gp);

        // All real transforms happen here, and are only applied to "origin"
        this.origin.position.copy(this.position);
        this.origin.quaternion.copy(this.rotation);
        
    }

    // Destructor
    destroy()
    {
        // remove from scene, free references
        this.myPosition = null;
        this.myRotation = null;
    }

};
