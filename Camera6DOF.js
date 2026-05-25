// this file: "Camera6DOF.js"
// import { Quaternion } from 'three/src/Three.Core.js';

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// GAME START: [X][Y][-Z] ... -z is "forward" 
//                                [Y]              [-Z] 
//                                **              **
//                                **            **
//                                **          **
//                                **        **
//                                **      **
//                                **    **
//                                **  **
//                                ****
//      ******************************************************[X]
//                              ****
//                            **  **
//                          **    **
//                        **      **
//                      **        **
//                    **          **
//                  **            **
//                **              **
////////////////////////////////////////////////////////////////////////////////////
// OPENGL 4X4 IDENTITY MATRIX
// | 1  0  0  0 |  ->  | m0 m4 m8  m12 |   // m0, m1, m2: First column, representing the x-axis direction vector.
// | 0  1  0  0 |  ->  | m1 m5 m9  m13 |   // m4, m5, m6: Second column, representing the y-axis direction vector.
// | 0  0  1  0 |  ->  | m2 m6 m10 m14 |   // m8, m9, m10: Third column, representing the z-axis direction vector.
// | 0  0  0  1 |  ->  | m3 m7 m11 m15 |   // m12, m13, m14: Translation components along the x, y, and z axes, respectively.
////////////////////////////////////////////////////////////////////////////////////
// OPENGL + RAYLIB "MATRIX" STRUCT
// | 1  0  0  10 |  ->  | m0  m4  m8  m12 |    // [12] = x-axis translation
// | 0  1  0  0  |  ->  | m1  m5  m9  m13 |    // [13] = y-axis translation
// | 0  0  1  0  |  ->  | m2  m6  m10 m14 |    // [14] = z-axis translation
// | 0  0  0  1  |  ->  | m3  m7  m11 m15 |    // [15] = always 1, required for matrix multiplication
////////////////////////////////////////////////////////////////////////////////////
// AXIS IN RELATION TO RAYLIB DEFAULT CAMERA POSITION
// [13][Y] = (+)up     (-)down
// [12][X] = (+)right  (-)left
// [14][Z] = (-)forward (+)back
////////////////////////////////////////////////////////////////////////////////////
// THREE.JS Matrix4 ELEMENT STORAGE (COLUMN MAJOR - SAME AS OPENGL)
// | 1  0  0  10 |  ->  | e0  e4  e8  e12 |
// | 0  1  0  0  |  ->  | e1  e5  e9  e13 |
// | 0  0  1  0  |  ->  | e2  e6  e10 e14 |
// | 0  0  0  1  |  ->  | e3  e7  e11 e15 |
//
// matrix.elements[12] = x position
// matrix.elements[13] = y position
// matrix.elements[14] = z position
//
// const e = mesh.matrix.elements;
// console.log(e[12], e[13], e[14]); // x, y, z world position
////////////////////////////////////////////////////////////////////////////////////
// THREE.JS WORLD AXIS CONVENTION
// Y+ = up
// X+ = right
// Z+ = toward camera / backward
// Z- = forward into the screen
//
// SAME HANDEDNESS + FORWARD DIRECTION AS OPENGL
// THREE.JS IS RIGHT-HANDED BY DEFAULT
////////////////////////////////////////////////////////////////////////////////////


export class Camera6DOF 
{

    /*******************
    **                **
    ** Construct      **
    **                **
    *******************/
    constructor(scene)
    {

        // WORLD
        //   └── origin
        //         ├── mesh
        //         ├── shipModel
        //         ├── camMount
        //         ├── camTarget
        //         └── camUpMount

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

        /***********
        **        **
        ** Model  **
        **        **
        ***********//*
        Workflow:
        |
        |
        |--> (TEXTURE) Build "Material" 
        |    This sends the PNG to the GPU memory immediately
        |    1) const albedoTex = textureLoader.load('../assets/sgs_01_texture.png');
        |    2) const normalTex = textureLoader.load('../assets/sgs_01_normals.png');
        |    3) const metalTex  = textureLoader.load('../assets/sgs_01_metal.png');
        |    4) const roughTex  = textureLoader.load('../assets/sgs_01_roughness.png');
        |
        |
        |--> (MESH) Second load "obj" with OBJLoader 
        |     This will default to gray if no "Material" is loaded
        |     1) const loader = new OBJLoader();
        |        loader.load('../assets/sgs_01.obj', (obj) => { this.shipModel = obj; this.origin.add(this.shipModel);}
        |
        |
        |--> (MESH + TEXTURE) Combine material and obj
        |     1) force model obj to use PBR material
        |
        |        loader.load('../assets/sgs_01.obj', (obj) => {
        |        // The "Traverse" logic:
        |        // OBJs are 'Groups'. We visit every 'Mesh' inside that group.
        |            obj.traverse((child) => {
        |                if (child.isMesh) {
        |                    // Overwrite the gray Blender material with our PBR skin
        |                    child.material = shipMaterial;
        |                }
        |            });
        |
        |            this.shipModel = obj;
        |            this.origin.add(this.shipModel);
        |
        |            this.mesh.visible = false; // Hide debug box
        |            this.shapeLines.visible = false;
        |        });
        
        In short: 
        * The Mesh is the solid thing I can "touch" (the 3D shape). 
        * The Texture is the colorful picture I "wrap" around it to make it look real.
        * The .obj file IS the Mesh. It’s just a long list of coordinates (X, Y, Z) that tell the computer where all the corners and edges of your ship are.
        * The .png file IS the Texture. It’s the 2D image that gets "shrink-wrapped" onto that shape.

        Implementation Logic:
        1. The Traverse Requirement: I'm using .traverse() because the OBJLoader returns a THREE.Group (a container) rather than a single mesh. Since a group doesn't have a material property, I have to iterate through the model’s
            hierarchy and manually inject my material into every individual Mesh child found inside.
        2. Metalness Multiplier (1.0): I’m setting the metalness property to 1.0 to act as a full-strength multiplier for my metalness map. If I leave this at the default (0.0), the shader will multiply the map’s values by zero,
            making the ship look like flat plastic regardless of the texture. Setting it to 1.0 tells the GPU to follow the map's data exactly.
        3. Lighting Requirements: Currently, main.js only uses an AmbientLight. For this PBR workflow—specifically the normal maps—to work, I’ll need to add a DirectionalLight or a PointLight. Without a light source that has a
            specific direction, the surface bumps won't cast micro-shadows, and the ship will look flat despite having high-res textures.

        Asset Manifest (Required in /assets):
        * sgs_01_texture.png: Albedo/Diffuse (The raw paint and base colors).
        * sgs_01_normals.png: Normal Map (The surface detail like bolts and panel lines).
        * sgs_01_metal.png: Metalness Map (Defining what parts are raw metal vs. paint).
        * sgs_01_roughness.png: Roughness Map (Defining what parts are shiny vs. matte).

        */

        /***********
        **        **
        **Texture ** // <--- if using ".obj" file from blender (my first attempts)
        **Material**
        **        **
        ***********/
        // const textureLoader = new THREE.TextureLoader();
        // const albedoTex = textureLoader.load('../assets/sgs_01_texture.png');
        // const normalTex = textureLoader.load('../assets/sgs_01_normals.png');
        // const metalTex  = textureLoader.load('../assets/sgs_01_metal.png');
        // const roughTex  = textureLoader.load('../assets/sgs_01_roughness.png');
        // albedoTex.colorSpace = THREE.SRGBColorSpace;
        // // build true PBR material
        // const shipMaterial = new THREE.MeshStandardMaterial({
        //     map: albedoTex,
        //     normalMap: normalTex,
        //     metalnessMap: metalTex,
        //     roughnessMap: roughTex,
        //     metalness: 1.0,
        //     roughness: 0.5
        // });


        /***********
        **        **
        **Model   ** // <--- if using ".obj" file from blender (my first attempts)
        **Mesh    **
        **        **
        ***********/
        // const loader = new OBJLoader();
        // loader.load('../assets/sgs_01.obj', (obj) => {
        //     obj.traverse((child) => {
        //         if (child.isMesh) {
        //             child.material = shipMaterial;

        //             // optional but VERY important for lighting quality
        //             child.castShadow = true;
        //             child.receiveShadow = true;
        //         }
        //     });


        //     this.shipModel = obj;
        //     this.origin.add(this.shipModel);

        //     this.mesh.visible = false;
        //     this.shapeLines.visible = false;
        // });


        /************************
        **                     **
        ** Texture   +   Model ** 
        ** Material      Mesh  **
        **                     **
        ************************/
        const loader = new GLTFLoader();

        loader.load('../assets/sgs_01.glb', (gltf) => {
            const model = gltf.scene;

            this.shipModel = model;
            this.origin.add(model);

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

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
        this.rotation.normalize();

    }

    /*******************
    **                **
    ** DRAW           **
    **                **
    *******************/
    /*
        THRUSTER MAP:
            |[01]|[02]|[03]|[04]|[05]|[06]|[07]|[08]|[09]|[10]|[11]|[12]|[13]|[14]|[15]|[16]|[17]|[18]|[19]|
        ----------------------------------------------------------------------------------------------------
        [A] |    |    |    | $$ |    |    |    | $$ | $$ |    |    |    | $$ |    |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        [B] |    |    | ++ | $$ |    | ++ | $$ | $$ | $$ | $$ | ++ |    | $$ | ++ |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        [C] |    |    |    |    |    |    | $$ | $$ | $$ | $$ |    |    |    |    |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        [D] |    |    |    |    |    |    | $$ | $$ | $$ | $$ |    |    |    |    |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        [E] |    |    | ++ | $$ |    | ++ | $$ | $$ | $$ | $$ | ++ |    | $$ | ++ |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        [F] |    |    |    | $$ |    |    |    | $$ | $$ |    |    |    | $$ |    |    |    |    |    |    |
        ----------------------------------------------------------------------------------------------------
        + = MINOR THRUSTER
        $ = MAJOR THRUSTER
    */
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
