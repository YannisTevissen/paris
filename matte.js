import * as THREE from './vendor/three.module.js';
// Matte painting for the far city, as film and game environments do: a real photographic Paris
// skyline ("Les toits de Paris, panorama - août 2015", Fred PO, CC BY-SA 2.0) with its sky cut out
// (tools/matte_skyline.py), wrapped on a ring 2.9 km out that follows the camera, hazed like the 3D
// city in front of it. The open southern view gets the panorama; the rest of the ring a mirrored copy.
const R=2900,PX_DEG=37.7,SKY_ROW=165,ROWS=501,USE=.92;
export function buildMatte(scene,fogColor){
 const tex=new THREE.TextureLoader().load('./assets/matte/paris_rooftops.png');tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;tex.wrapS=THREE.MirroredRepeatWrapping;
 const up=SKY_ROW/PX_DEG*Math.PI/180,down=(ROWS-SKY_ROW)/PX_DEG*Math.PI/180,top=R*Math.tan(up),bottom=-R*Math.tan(down);
 const g=new THREE.CylinderGeometry(R,R,top-bottom,256,1,true);g.translate(0,(top+bottom)/2,0);
 // 200 degrees of panorama per half turn; u runs 0..USE then mirrors back, so there is no seam.
 const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const u=uv.getX(i);uv.setX(i,u*2*USE);}
 const haze=fogColor;// live reference: daylight changes it
 const m=new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.BackSide,fog:false,color:new THREE.Color(1,.93,.84)});
 m.onBeforeCompile=s=>{s.uniforms.uHaze={value:haze};s.fragmentShader=s.fragmentShader.replace('void main() {','uniform vec3 uHaze;\nvoid main() {').replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb*.9,uHaze,.24);');};
 const ring=new THREE.Mesh(g,m);ring.rotation.y=Math.PI*.5;ring.renderOrder=-2;ring.frustumCulled=false;ring.userData.static=true;ring.name='matte';scene.add(ring);
 const base=m.color.clone();
 return {ring,update(camera){ring.position.set(camera.position.x,2,camera.position.z);},
  // Daylight dims and warms the photo with the scene's light.
  setLight(level,low){m.color.copy(base).multiplyScalar(level);m.color.g*=1-.12*low;m.color.b*=1-.25*low;}};}
