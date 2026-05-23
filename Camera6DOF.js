// this file: "Camera6DOF.js"
// import { Quaternion } from 'three/src/Three.Core.js';

import * as THREE from './node_modules/three/build/three.module.js';

export class Camera6DOF 
{

    /*******************
    **                **
    ** Construct      **
    **                **
    *******************/
    constructor(scene)
    {

        // origin root in relation to world space
        this.origin = new THREE.Object3D();
        scene.add(this.origin);

        // positioning and Rotations in relation to origin
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Quaternion();

        // visual model in relation to root above (can be considered local space)
        this.shape = new THREE.ConeGeometry(1,2,13);
        this.mat   = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
        this.mesh  = new THREE.Mesh(this.shape, this.mat);
 
        // offset of visual model (mesh != origin)
        this.mesh.rotation.x = Math.PI / 2;

        // attach the mesh as a child of the origin
        this.origin.add(this.mesh);

        // inputs... controller || mouse keyboard
        this.strafeInpt = 0;
        this.accelInput = 0;
        this.yawInput   = 0;
        this.pitchInput = 0;

        // physics + flight control characteristics
        this.forwardVector = new THREE.Vector3(0,0,1);
        this.deadZone = 0.15;
        
    }

    /*******************
    **                **
    ** Slave Camera   **
    **                **
    *******************/
    mountCamera(camera)
    {
        // camm obj is child of origin
        this.camera = camera;
        this.origin.add(this.camera);
        
        // reset local position
        this.camera.position.set(0, 0, 10);
        
        // rig forward is +Z (where the cone apex points).
        // camera default is -Z. Rotate 180 (PI) to align.
        this.camera.rotation.set(0, 0, 0);
    }

    /*******************
    **                **
    ** Process Inputs **
    **                **
    *******************/
    processInputs(gp)
    {
        // axes[0] → left stick X         (strafe)
        // axes[1] → left stick Y         (forward/back)
        // axes[2] → right stick X        (yaw)
        // axes[3] → right stick Y        (pitch)

        if (!gp) return;               // note "gp" will always return null at first load of webpage. must gaurd with "if (!gp) return;"
        this.strafeInpt = gp.axes[0];  // (strafe)
        this.accelInput = gp.axes[1];  // (foward/back)
        this.yawInput   = gp.axes[2];  // (yaw)
        this.pitchInput = gp.axes[3];  // (pitch) 

    }

    /*******************
    **                **
    ** Translate      **
    **                **
    *******************/
    translate()
    {

        /***********
        **        **
        **  Accel **
        **        **
        ***********/
        this.forwardVector.set(0,0,1); // <-- "reset"
        this.forwardVector.applyQuaternion(this.rotation);
        this.position.add(this.forwardVector.multiplyScalar(this.accelInput * 0.05));

        /***********
        **        **
        ** Strafe **
        **        **
        ***********/


    }

    /*******************
    **                **
    ** Rotate         **
    **                **
    *******************/
    rotate()
    {

        /***********
        **        **
        **  YAW   **
        **        **
        ***********/
        if (Math.abs(this.yawInput) > this.deadZone)
        {
            const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -this.yawInput * 0.05);
            this.rotation.multiply(yawQuaternion); // local
        }

        /***********
        **        **
        **  PITCH **
        **        **
        ***********/
        if (Math.abs(this.pitchInput) > this.deadZone)
        {
            const pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -this.pitchInput * 0.05);
            this.rotation.multiply(pitchQuaternion); // local
        }

        /***********
        **        **
        **  ROLL  **
        **        **
        ***********/

    }

    /*******************
    **                **
    ** DRAW           **
    **                **
    *******************/
    update(gp)
    {

        this.processInputs(gp);
        this.translate(); 
        this.rotate();

        // all real transforms are applied here and are only applied to "origin" not "mesh"
        this.origin.position.copy(this.position);
        this.origin.quaternion.copy(this.rotation);
        
    }

    /*******************
    **                **
    ** Destruct       **
    **                **
    *******************/
    destroy()
    {
        // remove from scene, free references
        this.myPosition = null;
        this.myRotation = null;
    }

};
