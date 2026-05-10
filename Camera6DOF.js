// this file: "Camera6DOF.js"
import * as THREE from './node_modules/three/build/three.module.js';

export class Camera6DOF 
{

    constructor(scene)
    {
        this.conesShape = new THREE.ConeGeometry(1,2,13);
        this.conesMeshMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
        this.myPosition = new THREE.Vector3(0, 0, 0);
        this.myRotation = new THREE.Quaternion();
        this.coneMesh = new THREE.Mesh(
            this.conesShape,
            this.conesMeshMaterial
        );

        scene.add(this.coneMesh);
        this.positionOnce();
    }

    // Setup the initial ofsett of the object in relation to its origin
    // keep in mind all rotations and translates will be based off this origin
    positionOnce()
    {
        this.myRotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        this.coneMesh.quaternion.copy(this.myRotation);
    }

    // Translates method
    translate(gp)
    {
        if (!gp) return;
        this.myPosition.x += gp.axes[0] * 0.05;
        this.coneMesh.position.copy(this.myPosition);
    }

    // Rotations method
    rotate(gp)
    {

    }

    // Update/Draw method
    update(gp)
    {
        this.translate(gp); 
        this.rotate(gp);
        
    }

    // Destructor
    destroy()
    {
        // remove from scene, free references
        this.myPosition = null;
        this.myRotation = null;
    }

};

