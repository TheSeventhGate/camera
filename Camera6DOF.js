// this file: "Camera6DOF.js"
// import { Quaternion } from 'three/src/Three.Core.js';

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

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
        this.timeElapsed   = 0.0;
        this.bobFrequency  = 1.2;  
        this.bobAmplitude  = 0.2;
        this.cameraBasePos = 0.0;

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

        // loading .obj from blender
        const loader = new OBJLoader();
        loader.load('../assets/sgs_01.obj', (obj) => {
            this.shipModel = obj;
            this.origin.add(this.shipModel);
            
            // hide debug box once ship is loaded
            this.mesh.visible = false;
            this.shapeLines.visible = false;
        });

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
        this.camera = camera;
        // DO NOT add to origin. Add to scene instead.
        // scene.add(this.camera); // Usually already in scene from main.js

        // Create a "Mount Point" that IS welded to the ship
        this.camMount = new THREE.Object3D();
        this.camMount.position.set(0, 6, 13.0);
        this.origin.add(this.camMount);

        // A point 1 unit directly "above" the ship center
        this.camUpMount = new THREE.Object3D();
        this.camUpMount.position.set(0, 1, 0); 
        this.origin.add(this.camUpMount);

        // Create a "LookAt Point" that IS welded to the ship
        this.camTarget = new THREE.Object3D();
        this.camTarget.position.set(0, 0, -32.0);
        this.origin.add(this.camTarget);
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
        this.thrust = THREE.MathUtils.clamp(this.thrust, -15.0, 3.0); // "-" = forward
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

        this.dt = dt;

        //  increment time at the very start so the math changes
        this.timeElapsed += dt;

        // bob to the Mount (which is a child of the ship)
        const bobOffset = Math.sin(this.timeElapsed * this.bobFrequency) * this.bobAmplitude;
        const driftOffset = Math.cos(this.timeElapsed * 0.05) * 0.01;

        // use the local offsets (0 for X, 6 for Y)
        this.camMount.position.x = 0 + driftOffset;
        this.camMount.position.y = 6 + bobOffset;

        // chase (World Space)
        const goalPosition = new THREE.Vector3();
        this.camMount.getWorldPosition(goalPosition);

        const goalLookAt = new THREE.Vector3();
        this.camTarget.getWorldPosition(goalLookAt);

        const shipUp = new THREE.Vector3();
        this.camUpMount.getWorldPosition(shipUp);
        const upDirection = shipUp.sub(this.origin.position).normalize();

        // lerp the camera towards the bobbing goal
        if (this.camera) 
        {
            // calc how far away the camera is from its ideal spot
            const distance = this.camera.position.distanceTo(goalPosition);

            // create a dynamic tightness: 
            // if distance is small, use 0.05 (lazy). 
            // if distance is huge, use 1.0 (hard-locked snap).
            const tightness = THREE.MathUtils.clamp(distance * 0.1, 0.01, 1.0);

            this.camera.position.lerp(goalPosition, tightness); 

            this.camera.up.copy(upDirection); 
            this.camera.lookAt(goalLookAt);
        }

        // call members and apply
        this.processInputs(gp);
        this.translate(); 
        this.rotate();
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
