import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {surface,leafTexture,decalTexture,sunUniform,sunLevel} from './materials.js';
import {Tree} from './vendor/ez-tree/lib/index.js';
// Full-size trees come from ez-tree (Dan Greenheck, MIT): generated branch structure with scanned bark
// and real leaf cards that sway in the wind. A handful of variants are generated once and instanced.
const PLANE_TREES=[['Ash Large',101,0xd9dcae],['Oak Large',202,0xe6d39a],['Ash Large',303,0xcfe0a4],['Ash Medium',404,0xe8cf8c],['Oak Medium',505,0xd4dca6]];
const forests=[];let variants=null;
function treeVariants(){if(variants)return variants;variants=PLANE_TREES.map(([preset,seedN,tint])=>{const t=new Tree();t.loadPreset(preset);const o=t.options;o.seed=seedN;
  // London plane look: pale mottled bark, a clear trunk, autumn-tinted foliage, slightly sparser cards.
  o.bark.tint=0xd8d3c4;o.leaves.tint=tint;o.leaves.count=Math.max(4,Math.round(o.leaves.count*.85));o.branch.start[1]=Math.max(o.branch.start[1],.38);t.generate();
  const box=new THREE.Box3().setFromObject(t);const bm=t.branchesMesh.material,lm=t.leavesMesh.material;
  const bark=new THREE.MeshStandardMaterial({map:bm.map,normalMap:bm.normalMap,aoMap:bm.aoMap,roughnessMap:bm.roughnessMap,color:bm.color,roughness:.95});
  const leaf=new THREE.MeshStandardMaterial({map:lm.map,color:lm.color,side:THREE.DoubleSide,alphaTest:lm.alphaTest,roughness:.75,dithering:true});
  const wind=lm.onBeforeCompile;leaf.onBeforeCompile=(sh,r)=>{wind(sh,r);
   // ez-tree's sway replaces project_vertex and drops the instance transform: put it back.
   sh.vertexShader=sh.vertexShader.replace('vec4 mvPosition = vec4(transformed, 1.0);','vec4 mvPosition = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n mvPosition = instanceMatrix * mvPosition;\n#endif');sh.uniforms.uWindStrength.value.set(.25,0,.25);leaf.userData.shader=sh;};leaf.customProgramCacheKey=()=>'ez-leaves';
  return {branches:t.branchesMesh.geometry,leaves:t.leavesMesh.geometry,bark,leaf,height:box.max.y-box.min.y};});return variants;}
function ezForest(scene,spots){if(!spots.length)return;const V=treeVariants(),groups=V.map(()=>[]);for(const s of spots)groups[Math.floor(rand()*V.length)].push(s);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0);
 V.forEach((v,i)=>{const list=groups[i];if(!list.length)return;const mats=list.map(s=>{const k=13*(s.scale??1)*(.88+rand()*.24)/v.height;q.setFromAxisAngle(Y,rand()*Math.PI*2);return m.clone().compose(new THREE.Vector3(s.x,s.y??0,s.z),q,new THREE.Vector3(k,k,k));});
  for(const [g,mat] of [[v.branches,v.bark],[v.leaves,v.leaf]]){const im=new THREE.InstancedMesh(g,mat,list.length);mats.forEach((mm,j)=>im.setMatrixAt(j,mm));im.castShadow=im.receiveShadow=true;im.userData.static=true;im.computeBoundingSphere();scene.add(im);}
  forests.push(v.leaf);});}
export function updateTrees(t){for(const l of forests)if(l.userData.shader)l.userData.shader.uniforms.uTime.value=t;}

// London plane trees as lined up on Paris promenades: tapered limbs with scanned bark,
// alpha-cut leaf clusters with soft canopy normals, autumn tints and leaf litter.
let seed=4242;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};

function limb(curve,r0,r1,seg=8,radial=7){const frames=curve.computeFrenetFrames(seg,false),len=curve.getLength(),pos=[],nor=[],uv=[],idx=[];
 for(let i=0;i<=seg;i++){const t=i/seg,P=curve.getPointAt(t),N=frames.normals[i],Bn=frames.binormals[i],r=r0+(r1-r0)*Math.pow(t,.8);
  for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2,c=Math.cos(a),s=Math.sin(a);const nx=c*N.x+s*Bn.x,ny=c*N.y+s*Bn.y,nz=c*N.z+s*Bn.z;pos.push(P.x+r*nx,P.y+r*ny,P.z+r*nz);nor.push(nx,ny,nz);uv.push(j/radial*Math.max(.35,r0*6.28/1.4),t*len/1.4);}}
 for(let i=0;i<seg;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;idx.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);return g;}

function leafMaterial(){const m=new THREE.MeshStandardMaterial({map:leafTexture(),alphaTest:.42,side:THREE.DoubleSide,roughness:.72,vertexColors:true});
 m.onBeforeCompile=s=>{s.uniforms.sunDir=sunUniform;s.uniforms.sunLevel=sunLevel;
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLeafWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvLeafWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLeafWorld;uniform vec3 sunDir;uniform float sunLevel;')
   .replace('#include <alphatest_fragment>','float leafDist=length(vLeafWorld-cameraPosition);if(diffuseColor.a<mix(.42,.16,smoothstep(12.,90.,leafDist)))discard;')
   .replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n{vec3 V=normalize(vLeafWorld-cameraPosition);float back=pow(max(dot(V,normalize(sunDir)),0.),3.);totalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.85,.55)*(back*1.4+.08)*sunLevel;}');};
 m.customProgramCacheKey=()=>'leaf-v1';m.userData.attributes=['color'];return m;}

// Distant trees: trunk plus a loose shell of large leaf cards, a few hundred vertices each.
function liteTree(B,mats,x,z,scale,y0){const h0=3.6*scale;B.add(limb(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,h0,0)]),.28*scale,.16*scale,2,6),mats.bark,x,y0,z,0,0,0,1,1,1,true);
 const pos=[],nor=[],uv=[],col=[],q=new THREE.Quaternion(),e=new THREE.Euler(),n=new THREE.Vector3();const cy=h0+3.2*scale;
 for(let i=0;i<42;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand()),p=new THREE.Vector3(Math.cos(a)*r*3.4*scale,(rand()-.4)*3.6*scale,Math.sin(a)*r*3.4*scale);const out=p.clone().normalize();p.y+=cy;const s=2.6*scale;q.setFromEuler(e.set(rand()*Math.PI,rand()*Math.PI*2,0));const c=rand()<.25?[1.05,.82,.4]:[.7+rand()*.2,.82+rand()*.15,.55];
  for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){const l=new THREE.Vector3(u*s*.5,v*s*.5,0).applyQuaternion(q);pos.push(p.x+l.x,p.y+l.y,p.z+l.z);n.set(0,0,1).applyQuaternion(q).lerp(out,.8).normalize();nor.push(n.x,n.y,n.z);uv.push((u+1)/2,(v+1)/2);col.push(...c);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));B.add(g,mats.leaves,x,y0,z,0,0,0,1,1,1,true);}

function tree(B,mats,x,z,scale,y0=0){const lean=new THREE.Vector3((rand()-.5)*.5,0,(rand()-.5)*.5);const h0=(3.4+rand()*.8)*scale;
 const trunk=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.1,0),new THREE.Vector3(lean.x*.3,h0*.5,lean.z*.3),new THREE.Vector3(lean.x,h0,lean.z)]);B.add(limb(trunk,.3*scale,.2*scale,6,9),mats.bark,x,y0,z,0,0,0,1,1,1,true);
 B.add(limb(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,.25,0)]),.42*scale,.3*scale,1,9),mats.bark,x,y0,z,0,0,0,1,1,1,true);
 const fork=new THREE.Vector3(lean.x,h0,lean.z),center=new THREE.Vector3(lean.x,h0+4.6*scale,lean.z),cards=[];
 const limbs=3+Math.floor(rand()*3);for(let i=0;i<limbs;i++){const a=i/limbs*Math.PI*2+rand()*.8,tilt=.35+rand()*.35,L=(5+rand()*2.2)*scale;const dir=new THREE.Vector3(Math.cos(a)*Math.sin(tilt),Math.cos(tilt),Math.sin(a)*Math.sin(tilt));
  const p1=fork.clone().addScaledVector(dir,L*.5).add(new THREE.Vector3(0,.3,0)),p2=fork.clone().addScaledVector(dir,L);p2.y+=rand()*.8;
  const curve=new THREE.CatmullRomCurve3([fork.clone(),p1,p2]);B.add(limb(curve,.17*scale,.06*scale,7,7),mats.bark,x,y0,z,0,0,0,1,1,1,true);
  const twigs=3+Math.floor(rand()*2);for(let k=0;k<twigs;k++){const t=.45+k/twigs*.5,start=curve.getPointAt(t),b=a+(rand()-.5)*1.8,up=.4+rand()*.8;const d2=new THREE.Vector3(Math.cos(b),up,Math.sin(b)).normalize(),L2=(1.8+rand()*1.6)*scale;const end=start.clone().addScaledVector(d2,L2);
   B.add(limb(new THREE.CatmullRomCurve3([start,start.clone().lerp(end,.5).add(new THREE.Vector3(0,.2,0)),end]),.06*scale,.02*scale,4,5),mats.bark,x,y0,z,0,0,0,1,1,1,true);
   for(let c=0;c<11;c++){const p=end.clone().add(new THREE.Vector3((rand()-.5)*2.6,(rand()-.4)*2,(rand()-.5)*2.6).multiplyScalar(scale));cards.push(p);}}
  for(let c=0;c<6;c++)cards.push(p2.clone().add(new THREE.Vector3((rand()-.5)*2.4,(rand()-.3)*1.8,(rand()-.5)*2.4)));}
 // Leaf cards: random orientation, normals bent outward from the canopy centre.
 const q=new THREE.Quaternion(),e=new THREE.Euler(),n=new THREE.Vector3(),tmp=new THREE.Vector3();const autumn=rand();
 const pos=[],nor=[],uv=[],col=[];for(const p of cards){const s=(1.5+rand()*.9)*scale;q.setFromEuler(e.set(rand()*Math.PI,rand()*Math.PI*2,rand()*Math.PI));const corners=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
  const outward=tmp.copy(p).sub(center).normalize();const tint=rand();const c=tint<.16+autumn*.18?[1.15,.85,.35]:tint<.3?[.95,.95,.55]:[.78+rand()*.2,.9+rand()*.15,.6+rand()*.2];
  for(const [u,v] of corners){const local=new THREE.Vector3(u*s*.5,v*s*.5,0).applyQuaternion(q);pos.push(p.x+local.x,p.y+local.y,p.z+local.z);n.set(0,0,1).applyQuaternion(q).lerp(outward,.75).normalize();nor.push(n.x,n.y,n.z);uv.push((u+1)/2,(v+1)/2);col.push(...c);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));B.add(g,mats.leaves,x,y0,z,0,0,0,1,1,1,true);}

export function plantTrees(scene,spots,obstacles){const B=new Builder(),ez=[];
 const bark=surface('bark',[1,1],{macro:.1,grime:.6});bark.userData.ownUV=true;bark.color.setRGB(1.55,1.48,1.36);
 const leaves=leafMaterial();
 const grate=new THREE.MeshStandardMaterial({color:'#262826',roughness:.5,metalness:.6,alphaMap:decalTexture('grate'),alphaTest:.5,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});grate.userData.castShadow=false;
 const litter=new THREE.MeshStandardMaterial({map:decalTexture('leaves'),transparent:true,depthWrite:false,roughness:.85,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});litter.userData.castShadow=false;litter.userData.ground=true;grate.userData.ground=true;
 const mats={bark,leaves};
 for(const s of spots){if(s.lite){liteTree(B,mats,s.x,s.z,s.scale??1,s.y??0);continue;}ez.push(s);if(s.y)continue;if(s.grate)B.add(new THREE.PlaneGeometry(1.9,1.9),grate,s.x,.008,s.z,-Math.PI/2,0,0);for(let i=0;i<3;i++){const r=1+rand()*3.5,a=rand()*7;B.add(new THREE.PlaneGeometry(1,1),litter,s.x+Math.cos(a)*r,.01,s.z+Math.sin(a)*r,-Math.PI/2,0,rand()*7,2+rand()*2.5,2+rand()*2.5,1);}
  if(obstacles&&!s.y)obstacles.push({x:s.x,z:s.z,w:.7,d:.7,h:5,label:'Tree impact'});}
 ezForest(scene,ez);return B.build(scene);}
