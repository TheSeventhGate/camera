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
        // all edges and lines and mat below is for debug only
        this.shape = new THREE.BoxGeometry( 1, 1, 1 );
        this.shapeEdges = new THREE.EdgesGeometry(this.shape);
        this.shapeLines = new THREE.LineSegments(this.shapeEdges);
        this.mat   = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: false, transparent: true, opacity: 0.5});
        this.mesh  = new THREE.Mesh(this.shape, this.mat);




        // offset of visual model (mesh != origin)
        this.mesh.rotation.x = Math.PI / 2;

        // attach the mesh as a child of the origin
        this.origin.add(this.mesh);
        this.origin.add(this.shapeLines)


        // inputs... controller || mouse keyboard
        this.strafeInpt = 0;
        this.accelInput = 0;
        this.yawInput   = 0;
        this.pitchInput = 0;
        this.leftBumper = 0;
        this.rghtBumper = 0;
        this.leftTriggr = 0;
        this.rghtTriggr = 0;

        // physics + flight control characteristics
        this.deadZone        = 0.15;
        this.rollDelta       = 0;
        this.strafeVector    = new THREE.Vector3(1, 0, 0); // x
        this.forwardVector   = new THREE.Vector3(0, 0, 1); // z
        this.rightAxis       = new THREE.Vector3(1, 0, 0); // x
        this.upAxis          = new THREE.Vector3(0, 1, 0); // y
        this.fwrdAxis        = new THREE.Vector3(0, 0, 1); // z
        this.pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -this.pitchInput * 0.05); // x
        this.yawQuaternion   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -this.yawInput   * 0.05); // y
        this.rollQuaternion  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),  this.rollDelta  * 0.05); // z
        
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
        this.camera.position.set(0, 1, 5);
        
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

        if (!gp) return;               // note "gp" will always return null at first load of webpage. must gaurd with "if (!gp) return;"

        // axes
        this.strafeInpt = gp.axes[0];  // (strafe)
        this.accelInput = gp.axes[1];  // (foward/back)
        this.yawInput   = gp.axes[2];  // (yaw)
        this.pitchInput = gp.axes[3];  // (pitch) 

        // buttons
        this.leftBumper = gp.buttons[4];
        this.rghtBumper = gp.buttons[5];

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
        this.strafeVector.set(1,0,0);
        this.strafeVector.applyQuaternion(this.rotation);
        this.position.add(this.strafeVector.multiplyScalar(this.strafeInpt * 0.05));

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
            this.yawQuaternion.setFromAxisAngle(this.upAxis, -this.yawInput * 0.05);
            this.rotation.multiply(this.yawQuaternion); // local see A * B order of this quaternion in constructor
        }

        /***********
        **        **
        **  PITCH **
        **        **
        ***********/
        if (Math.abs(this.pitchInput) > this.deadZone)
        {
            this.pitchQuaternion.setFromAxisAngle(this.rightAxis, -this.pitchInput * 0.05);
            this.rotation.multiply(this.pitchQuaternion); //local see A * B order of this quaternion in constructor
        }

        /***********
        **        **
        **  ROLL  **
        **        **
        ***********/
        if (this.leftBumper.pressed)
        {
            this.rollDelta = 0.1;
            this.rollQuaternion.setFromAxisAngle(this.fwrdAxis, this.rollDelta * 0.05);
            this.rotation.multiply(this.rollQuaternion);
        }

        if (this.rghtBumper.pressed)
        {
            this.rollDelta = -0.1;
            this.rollQuaternion.setFromAxisAngle(this.fwrdAxis, this.rollDelta * 0.05);
            this.rotation.multiply(this.rollQuaternion);
        }

    }

    /*******************
    **                **
    ** DRAW           **
    **                **
    *******************/
    update(gp)
    {
        // functions to be called every tick
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
