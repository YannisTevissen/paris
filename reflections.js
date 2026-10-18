import * as THREE from './vendor/three.module.js';
import {reflectionUniforms} from './materials.js';
// Planar reflection of the city in the wet ground (y = 0): a mirrored camera renders the scene
// at reduced resolution with an oblique near plane, and ground shaders sample it in puddles.
export class GroundReflection{
 constructor(renderer,scene,camera,scale=.5){this.renderer=renderer;this.scene=scene;this.camera=camera;this.scale=scale;
  this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:0});this.target.texture.generateMipmaps=false;
  this.mirror=new THREE.PerspectiveCamera();this.normal=new THREE.Vector3(0,1,0);this.plane=new THREE.Plane();this.clip=new THREE.Vector4();this.q=new THREE.Vector4();
  this.view=new THREE.Vector3();this.target3=new THREE.Vector3();this.look=new THREE.Vector3();this.rot=new THREE.Matrix4();this.cam=new THREE.Vector3();
  reflectionUniforms.tReflect.value=this.target.texture;this.hidden=[];this.enabled=true;}
 setSize(w,h,ratio){this.target.setSize(Math.max(1,Math.round(w*ratio*this.scale)),Math.max(1,Math.round(h*ratio*this.scale)));}
 update(){if(!this.enabled)return;const cam=this.camera;cam.updateMatrixWorld();this.cam.setFromMatrixPosition(cam.matrixWorld);if(this.cam.y<=.05){reflectionUniforms.reflectStrength.value=0;return;}reflectionUniforms.reflectStrength.value=1;
  // Mirror position, view target and up vector across the ground plane.
  this.view.copy(this.cam);this.view.y=-this.view.y;this.rot.extractRotation(cam.matrixWorld);this.look.set(0,0,-1).applyMatrix4(this.rot).add(this.cam);this.target3.copy(this.look);this.target3.y=-this.target3.y;
  const m=this.mirror;m.position.copy(this.view);m.up.set(0,1,0).applyMatrix4(this.rot);m.up.y=-m.up.y;m.lookAt(this.target3);m.near=cam.near;m.far=cam.far;m.aspect=cam.aspect;m.fov=cam.fov;m.updateMatrixWorld();m.projectionMatrix.copy(cam.projectionMatrix);
  const tm=reflectionUniforms.reflectMatrix.value;tm.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);tm.multiply(m.projectionMatrix).multiply(m.matrixWorldInverse);
  // Oblique near plane so nothing under the ground leaks into the reflection.
  this.plane.setFromNormalAndCoplanarPoint(this.normal,new THREE.Vector3(0,.01,0)).applyMatrix4(m.matrixWorldInverse);this.clip.set(this.plane.normal.x,this.plane.normal.y,this.plane.normal.z,this.plane.constant);const p=m.projectionMatrix.elements;
  this.q.set((Math.sign(this.clip.x)+p[8])/p[0],(Math.sign(this.clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]);this.clip.multiplyScalar(2/this.clip.dot(this.q));p[2]=this.clip.x;p[6]=this.clip.y;p[10]=this.clip.z+1;p[14]=this.clip.w;m.projectionMatrixInverse.copy(m.projectionMatrix).invert();
  const r=this.renderer,hidden=this.hidden;hidden.length=0;this.scene.traverseVisible(o=>{if(o.name==='real-paris'||o.material&&o.material.userData&&o.material.userData.ground)hidden.push(o);});for(const o of hidden)o.visible=false;
  const old=r.getRenderTarget(),oldShadow=r.shadowMap.autoUpdate;r.shadowMap.autoUpdate=false;r.setRenderTarget(this.target);r.clear();r.render(this.scene,m);r.setRenderTarget(old);r.shadowMap.autoUpdate=oldShadow;for(const o of hidden)o.visible=true;}
}
