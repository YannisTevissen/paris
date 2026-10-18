import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/jsm/utils/BufferGeometryUtils.js';
import {worldUV} from './materials.js';
// Collects transformed geometry per material and merges each list into one static mesh.
// Scanned materials get world-space UVs after placement, so texel density never stretches.
const UNIT_BOX=new THREE.BoxGeometry(1,1,1);
export class Builder{
 constructor(){this.lists=new Map();this.m=new THREE.Matrix4();this.q=new THREE.Quaternion();this.e=new THREE.Euler();this.p=new THREE.Vector3();this.s=new THREE.Vector3();this.frames=[];}
 // Local frames let facade code work in its own x/y/z and land correctly in the world.
 push(x=0,y=0,z=0,ry=0){const f=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(1,1,1));const parent=this.frames[this.frames.length-1];if(parent)f.premultiply(parent);this.frames.push(f);return this;}
 pop(){this.frames.pop();return this;}
 add(geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1,own=false){const g=own?geometry:geometry.clone();this.m.compose(this.p.set(x,y,z),this.q.setFromEuler(this.e.set(rx,ry,rz)),this.s.set(sx,sy,sz));const f=this.frames[this.frames.length-1];if(f)this.m.premultiply(f);g.applyMatrix4(this.m);let list=this.lists.get(material);if(!list){list=[];this.lists.set(material,list);}list.push(g);return g;}
 box(w,h,d,material,x=0,y=0,z=0,ry=0,rx=0,rz=0){if(w<=0||h<=0||d<=0)return null;return this.add(UNIT_BOX,material,x,y,z,rx,ry,rz,w,h,d);}
 // Box given by its min/max corners in the current frame.
 span(x0,x1,y0,y1,z0,z1,material){return this.box(x1-x0,y1-y0,z1-z0,material,(x0+x1)/2,(y0+y1)/2,(z0+z1)/2);}
 cyl(r0,r1,h,material,x,y,z,seg=12,rx=0,ry=0,rz=0){return this.add(new THREE.CylinderGeometry(r0,r1,h,seg),material,x,y,z,rx,ry,rz,1,1,1,true);}
 // Arbitrary quad from four corners (counter-clockwise seen from the front).
 quad(material,a,b,c,d,uvScale=null){const g=new THREE.BufferGeometry();const pos=[...a,...b,...c,...a,...c,...d];g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));const L=uvScale?[Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])/uvScale,Math.hypot(d[0]-a[0],d[1]-a[1],d[2]-a[2])/uvScale]:[1,1];g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,L[0],0,L[0],L[1],0,0,L[0],L[1],0,L[1]],2));g.computeVertexNormals();return this.add(g,material,0,0,0,0,0,0,1,1,1,true);}
 poly(material,points){const g=new THREE.BufferGeometry();const pos=[];for(let i=1;i<points.length-1;i++)pos.push(...points[0],...points[i],...points[i+1]);g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Array(pos.length/3*2).fill(0),2));g.computeVertexNormals();return this.add(g,material,0,0,0,0,0,0,1,1,1,true);}
 build(scene,options={}){const meshes=[];for(const [material,list] of this.lists){if(!list.length)continue;const keep=['position','normal','uv',...(material.userData.attributes||[])];const nonIndexed=list.some(g=>!g.index);const parts=list.map(g=>{let geo=nonIndexed&&g.index?g.toNonIndexed():g;for(const name of Object.keys(geo.attributes))if(!keep.includes(name))geo.deleteAttribute(name);if(!geo.attributes.uv)geo.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));if(!geo.attributes.normal)geo.computeVertexNormals();geo.clearGroups();geo.morphAttributes={};if(material.userData.scanned&&!material.userData.ownUV)worldUV(geo,material.userData.tileSize);return geo;});const merged=mergeGeometries(parts,false);list.forEach(g=>g.dispose());if(!merged){console.warn('Merge failed for',material.name||material.type);continue;}merged.computeBoundingSphere();const mesh=new THREE.Mesh(merged,material);mesh.castShadow=material.userData.castShadow??options.castShadow??true;mesh.receiveShadow=material.userData.receiveShadow??true;mesh.userData.static=true;mesh.matrixAutoUpdate=false;mesh.updateMatrix();scene.add(mesh);meshes.push(mesh);}this.lists.clear();return meshes;}
}
