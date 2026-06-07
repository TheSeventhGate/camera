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
// this file: "Camera6DOF.js"
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
        /*
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

        /************************
        **                     **
        ** Texture   +   Model ** 
        ** Material      Mesh  ** // <--- if using ".gltf" I found skinning the model diffuclt with gltf
        **                     ** // <--- this did not work well with the blender export
        ************************/
        //  const textureLoader = new THREE.TextureLoader();
        
        //  // 1. Load your PNG from the assets folder
        //  const shipPaint = textureLoader.load('../assets/ImageForBlackReflective.png');
        
        //  // 2. Ensure colors are vibrant (sRGB) and not washed out
        //  shipPaint.colorSpace = THREE.SRGBColorSpace; 
        
        //  // 3. GLTF models use a different coordinate system for textures than OBJs
        // shipPaint.flipY = false; 

        //     const manualMaterial = new THREE.MeshStandardMaterial({
        //     map: shipPaint,     // Use your painted PNG
        //     color: 0xffffff,    // Neutral white (Let the texture colors shine)
        //     metalness: 0.5,     // 100% Metallic
        //     roughness: 0.5      // Mirror-like finish
        // });

        /*
            THRUSTER MAP from "six_dof_object.c":
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

//import * as THREE from 'three';
import * as THREE from 'three/webgpu';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Camera6DOF 
{

    /*******************
    **                **
    ** Construct      **
    **                **
    *******************/
    constructor(scene)
    {

        // world
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

        // visual model in relation to root above (can be considered local space)
        // all edges and lines and mat below is for debug only
        this.shape      = new THREE.BoxGeometry( 1, 1, 1 );
        this.shapeEdges = new THREE.EdgesGeometry(this.shape);
        this.shapeLines = new THREE.LineSegments(this.shapeEdges);
        this.mat        = new THREE.MeshBasicMaterial({color: 0Xdb341f, wireframe: false, transparent: true, opacity: 0.5});
        this.mesh       = new THREE.Mesh(this.shape, this.mat);

        // attach the mesh as a child of the origin
        this.origin.add(this.mesh);
        this.origin.add(this.shapeLines)

        /***********
        **        **
        **Texture **
        **Material**
        **        **
        ***********/
        const textureLoader = new THREE.TextureLoader();

        const shipPaint = textureLoader.load('../assets/ImageForBlackReflective.png');
        shipPaint.colorSpace = THREE.SRGBColorSpace;

        const shipMaterial = new THREE.MeshStandardMaterial({
            map: shipPaint,
            color: 0xffffff,    // Keep white so the texture colors are accurate
            metalness: 0.8,     // High metalness for that "reflective" look
            roughness: 0.2      // Low roughness for a glossy/shiny finish
        });

        /***********
        **        **
        ** Model  **
        ** Mesh   **
        **        **
        ***********/
        const loader = new OBJLoader();
        loader.load('../assets/sgs_02.obj', (obj) => {
            
            // traverse the group to find the mesh pieces
            obj.traverse((child) => {
                if (child.isMesh) {
                    // Apply our custom material to every part of the OBJ
                    child.material = shipMaterial;
    
                    // Enable shadows for better depth
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
    
            // raw model obj from blender export
            this.shipModel = obj;
            this.origin.add(this.shipModel);
    
            // hide the debug wireframe box
            this.mesh.visible = false;
            this.shapeLines.visible = false;
        });


        /***********
        **        **
        **Thruster**
        **Animates**
        **        **
        ***********/
        // material used by all thrusters
        // this.thrusterMaterial = new THREE.MeshBasicMaterial({
        //     color: 0x00ffff,
        //     transparent: true,
        //     opacity: 0.8,
        //     side: THREE.DoubleSide
        // });

        // inputs controller (windows xbox controller)
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
        this.buttonA    = { pressed: false, value: 0 };
        this.buttonX    = { pressed: false, value: 0 };

        // inputs mouse and keyboard
        // ....

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

        // camera state
        this.firstPerson = false;
        this.buttonXPrev = false;

        // camera
        this.camera           = null;
        this.timeElapsed      = 0.0;
        this.cameraFrequency  = 1.2;  
        this.cameraAmplitude  = 0.002;
        this.cameraBasePos    = 0.0;

        // camera trailing /elastic behavior
        // this.lookTarget    = new THREE.Vector3(0, 1, -35);// <-- breaks look at if i do it this way
        this.vTargetPos  = new THREE.Vector3();
        this.vOffset     = new THREE.Vector3();
        this.vLookTarget = new THREE.Vector3();
        this.vWorldUp    = new THREE.Vector3();
        this.camWeldPoint     = new THREE.Vector3(0, 4, 12); // Ideal chase position
        this.camRadius        = 1.5;                         // Max displacement sphere
        this.camLerpSpeed     = 4.0;                         // How fast it returns to target
        this.camInertia       = 0.5;                         // Sensitivity to movement
        

    }

    /*******************
    **                **
    ** Slave Camera   **
    **                **
    *******************/
    mountCamera(camera)
    {   
        // camera reference (by default js passes everything by reference)
        this.camera = camera;

        if(this.firstPerson)
        {
            // [1st] person view: (no position set just defaults to obj origin)
            this.origin.add(this.camera);
        } 
        else 
        {
            // [3rd] person view:
            this.origin.add(this.camera);
            this.camera.position.copy(this.camWeldPoint); // Start at the weld point
        }


    }

    /*******************
    **                **
    ** Update Camera  **
    **                **
    *******************/
    updateCamera()
    {
        if (!this.camera) return;

        if (this.buttonX.pressed && !this.buttonXPrev)
        {
            this.firstPerson = !this.firstPerson;
        }
        this.buttonXPrev = this.buttonX.pressed;

        if (this.shipModel)
        {   
            this.shipModel.visible = !this.firstPerson;
        }

        if (this.firstPerson)
        {
            // no camera bob implement yet for first person
            this.camera.position.set(0, 0, 0); 
        }
        else
        {
            // displacement variables for camera leaning effect
            let lagX = -this.strafeThrust * 0.4 - this.yawVelocity * 1.5;
            let lagY = -this.pitchVelocity * 1.5;
            let lagZ = -this.thrust * 0.6;
   
             // combine welded cam point + above lags into a "target" position
            this.vTargetPos.set(
                this.camWeldPoint.x - lagX,
                this.camWeldPoint.y - lagY,
                this.camWeldPoint.z + lagZ
            );
   
             // lerp the current position towards targetPos
            this.camera.position.lerp(this.vTargetPos, this.camLerpSpeed * this.dt);
   
            // bounding sphere: clamp the camera within camRadius of the Weld Point
            this.vOffset.subVectors(this.camera.position, this.camWeldPoint);
            if (this.vOffset.length() > this.camRadius) 
            {
                this.vOffset.setLength(this.camRadius);
                this.camera.position.addVectors(this.camWeldPoint, this.vOffset);
            }
   
            // look slightly ahead or at the ship
            // convert a local point in front of the ship to world space for the camera to look at
            this.vLookTarget.set(0, 1, -35); 
            this.origin.localToWorld(this.vLookTarget);
   
            // to make the camera roll with the ship, we must tell it what "Up" is 
            // in world space. Otherwise, .lookAt() defaults to world-up (0,1,0)
            this.vWorldUp.set(0, 1, 0);
            this.vWorldUp.applyQuaternion(this.origin.quaternion);
            this.camera.up.copy(this.vWorldUp);
   
            // i look at the correct target
            this.camera.lookAt(this.vLookTarget);
   
            // sinusoidal action on y
            this.camera.position.y += Math.sin(this.timeElapsed * this.cameraFrequency) * this.cameraAmplitude;

        }
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
        this.buttonA    = gp.buttons[0]; // (A Button)
        this.buttonX    = gp.buttons[2]; // (X Button)

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
        this.rotation.multiply(this.yawQuaternion); // local see A * B order of this quaternion in constructor // premultiply would be B * A
        this.rotation.normalize(); 

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
        this.rotation.multiply(this.pitchQuaternion); // local see A * B order of this quaternion in constructor // premultiply would be B * A
        this.rotation.normalize(); 

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
    update(gp, dt) // gp = gamepad ... dt = deltatime
    {

        // increment time at the very start so the math changes
        this.dt = dt;
        this.timeElapsed += dt;

        // call members and apply
        this.processInputs(gp);
        this.translate(); 
        this.rotate();
        this.origin.quaternion.copy(this.rotation); // <-- world space implementation

        // camera follows player
        this.updateCamera();
        
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