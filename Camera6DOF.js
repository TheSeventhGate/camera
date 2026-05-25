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

        // timing
        this.dt = 0.0;

        // origin root in relation to world space
        this.origin = new THREE.Object3D();
        scene.add(this.origin);

        // positioning and rotations in relation to origin
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Quaternion();

        // camera
        this.timeElapsed  = 0.0;
        this.bobFrequency = 0.1;  
        this.bobAmplitude = 0.2;

        // visual model in relation to root above (can be considered local space)
        // all edges and lines and mat below is for debug only
        this.shape = new THREE.BoxGeometry( 1, 1, 1 );
        this.shapeEdges = new THREE.EdgesGeometry(this.shape);
        this.shapeLines = new THREE.LineSegments(this.shapeEdges);
        this.mat   = new THREE.MeshBasicMaterial({color: 0Xdb341f, wireframe: false, transparent: true, opacity: 0.5});
        this.mesh  = new THREE.Mesh(this.shape, this.mat);

        // offset from visual model (mesh != origin)
        this.mesh.rotation.x = Math.PI / 2;

        // attach the mesh as a child of the origin
        this.origin.add(this.mesh);
        this.origin.add(this.shapeLines)

        // inputs controller + mouse keyboard
        this.strafeInpt = 0.0;
        this.accelInput = 0.0;
        this.yawInput   = 0.0;
        this.pitchInput = 0.0;
        this.rollInput  = 0.0;
        this.rollDelta  = 0.0;
        this.deadZone   = 0.1;
        this.leftTriggr = { pressed: false, value: 0 }; 
        this.rghtTriggr = { pressed: false, value: 0 }; 
        this.leftBumper = { pressed: false, value: 0 }; 
        this.rghtBumper = { pressed: false, value: 0 };

        // vectors + flight control characteristics
        this.strafeVector    = new THREE.Vector3(1, 0, 0); // x
        this.forwardVector   = new THREE.Vector3(0, 0, 1); // z
        this.rightAxis       = new THREE.Vector3(1, 0, 0); // x
        this.upAxis          = new THREE.Vector3(0, 1, 0); // y
        this.fwrdAxis        = new THREE.Vector3(0, 0, 1); // z
        this.pitchQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), -this.pitchInput * 0.05); // x
        this.yawQuaternion   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -this.yawInput   * 0.05); // y
        this.rollQuaternion  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),  this.rollDelta  * 0.05); // z
        
        // velocities + thrusts + speeds
        this.accelSpeed    = 6.0;      // z ... translate ... -z forward
        this.strafeSpeed   = 3.0;      // x ... translate
        this.pitchSpeed    = 0.8;      // x ... rotate
        this.yawSpeed      = 2.0;      // y ... rotate
        this.rollSpeed     = 1.8;      // z ... rotate
        this.thrust        = 0.0;     
        this.strafeThrust  = 0.0;
        this.yawVelocity   = 0.0;
        this.pitchVelocity = 0.0;
        this.rollVelocity  = 0.0;

        // stabilizers + auto levellers
        this.dampAccelSpeed    = 0.01; // z ... translate ... -z forward
        this.dampStrafeSpeed   = 0.1;  // x ... translate
        this.damPitchSpeed     = 0.1;  // x ... rotate
        this.dampYawSpeed      = 0.1;  // y ... rotate
        this.dampRollSpeed     = 0.1;  // z ... rotate

    }

    /*******************
    **                **
    ** Slave Camera   **
    **                **
    *******************/
    mountCamera(camera)
    {
        // camm obj is child of origin
        this.camera = camera; // <-- here i create a new pointer to the referenced camera, now i can modify game cam
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

        // note "gp" will always return null at first load of webpage. must gaurd with "if (!gp) return;"
        if (!gp) return;               

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
        this.thrust = THREE.MathUtils.clamp(this.thrust, -10.0, 1.0); // "-" = forward
        if (Math.abs(this.accelInput) > this.deadZone)
        {
            this.thrust += this.accelInput * this.accelSpeed * this.dt;
        } 
        else 
        {
            this.thrust *= 0.99; // loss of % each frame
            if (Math.abs(this.thrust) < 0.03 )
            {
                this.thrust = 0; // technicly a cast, but worth it for true 0...
            } 
        }

        // apply accelleration
        this.forwardVector.set(0,0,1);  // <-- "reset"
        this.forwardVector.applyQuaternion(this.rotation);
        this.position.add(this.forwardVector.multiplyScalar(this.thrust * this.dt));
        //console.log(this.thrust + " " + this.accelInput)

        /***********
        **        **
        ** Strafe **
        **        **
        ***********/
        this.strafeThrust = THREE.MathUtils.clamp(this.strafeThrust, -2.0, 2.0);
        if (Math.abs(this.strafeInpt) > this.deadZone)
        {
            this.strafeThrust += this.strafeInpt * this.strafeSpeed * this.dt;
        }
        else
        {
            this.strafeThrust *= 0.99;
            if (Math.abs(this.strafeThrust) < 0.03)
            {
                this.strafeThrust = 0;
            }
        }

        // apply strafe
        this.strafeVector.set(1,0,0);
        this.strafeVector.applyQuaternion(this.rotation);
        this.position.add(this.strafeVector.multiplyScalar(this.strafeThrust * this.dt));
        //console.log(this.strafeThrust + " " + this.strafeInpt);

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
        this.yawVelocity = THREE.MathUtils.clamp(this.yawVelocity, -100.0, 100.0);
        if (Math.abs(this.yawInput) > this.deadZone)
        {
            this.yawVelocity += this.yawInput * this.yawSpeed * this.dt;
        }
        else
        {
            this.yawVelocity *= 0.98;
            if (Math.abs(this.yawVelocity) < 0.02)
            {
                this.yawVelocity = 0;
            }
        }

        // apply yaw
        this.yawQuaternion.setFromAxisAngle(this.upAxis, -this.yawVelocity * this.dt);
        this.rotation.multiply(this.yawQuaternion); // local see A * B order of this quaternion in constructor

        /***********
        **        **
        **  PITCH **
        **        **
        ***********/
        this.pitchVelocity = THREE.MathUtils.clamp(this.pitchVelocity, -1.0, 1.0);
        if (Math.abs(this.pitchInput) > this.deadZone)
        {
            this.pitchVelocity += this.pitchInput * this.pitchSpeed * this.dt;
        }
        else
        {
            this.pitchVelocity *= 0.99;
            if (Math.abs(this.pitchVelocity) < 0.02)
            {
                this.pitchVelocity = 0;
            }
        }

        // apply pitch
        this.pitchQuaternion.setFromAxisAngle(this.rightAxis, -this.pitchVelocity * this.dt);
        this.rotation.multiply(this.pitchQuaternion); //local see A * B order of this quaternion in constructor

        /***********
        **        **
        **  ROLL  **
        **        **
        ***********/
        this.rollVelocity = THREE.MathUtils.clamp(this.rollVelocity, -5.0, 5.0);
   
        // calculate Roll Acceleration
        if (this.leftBumper.pressed) 
        {
            this.rollVelocity += 1.0 * this.rollSpeed * this.dt;
        } 
        else if (this.rghtBumper.pressed) 
        {
            this.rollVelocity -= 1.0 * this.rollSpeed * this.dt;
        } 
        else 
        {
            // ONLY damp if neither bumper is pressed
            this.rollVelocity *= 0.98;
            if (Math.abs(this.rollVelocity) < 0.02) this.rollVelocity = 0;
        }

        // apply Roll (The finalized velocity)
        this.rollQuaternion.setFromAxisAngle(this.fwrdAxis, this.rollVelocity * this.dt);
        this.rotation.multiply(this.rollQuaternion);

    }

    /*******************
    **                **
    ** DRAW           **
    **                **
    *******************/
    update(gp, dt) // gp = gamepad ... dt = deltatime
    {

        // time
        this.dt = dt;

        // camera sinusoidal bob
        this.timeElapsed += dt;
        const bobOffset = Math.sin(this.timeElapsed * this.bobFrequency) * this.bobAmplitude;
        if (this.camera) 
        {
            this.camera.position.y = 1.0 + bobOffset; // y axis bob
            // a tiny bit of horizontal "drift" using Math.cos
            const driftOffset = Math.cos(this.timeElapsed * 0.4) * 0.01;
            this.camera.position.x = driftOffset;
        }



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
