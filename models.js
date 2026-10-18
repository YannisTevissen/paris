import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/jsm/loaders/GLTFLoader.js';
// Scanned CC0 glTF props (Poly Haven). Each model is flattened to world-space parts so a Builder
// can merge every placement into the city's per-material batches.
const loader=new GLTFLoader();
export async function loadModels(names){const out={};await Promise.all(names.map(async name=>{try{const gltf=await loader.loadAsync(`./assets/models/${name}/${name}_1k.gltf`);gltf.scene.updateMatrixWorld(true);const parts=[];
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);const m=o.material;
  if(/bulb/.test(m.name)){m.emissive=new THREE.Color('#ffcf8a');m.emissiveIntensity=3;m.userData.castShadow=false;}
  if(/glass/.test(m.name)){m.userData.castShadow=false;m.depthWrite=false;m.roughness=.05;}
  if(m.alphaTest>0)m.side=THREE.DoubleSide;parts.push({geometry,material:m});});
 const box=new THREE.Box3();for(const p of parts){p.geometry.computeBoundingBox();box.union(p.geometry.boundingBox);}out[name]={parts,box};}catch(e){console.warn('Model unavailable:',name,e);}}));return out;}
export function placeModel(B,model,x,y,z,ry=0,s=1){if(!model)return false;for(const p of model.parts)B.add(p.geometry,p.material,x,y,z,0,ry,0,s,s,s);return true;}
export const loadGLB=url=>loader.loadAsync(url);
