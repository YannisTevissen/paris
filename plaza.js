import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {surface} from './materials.js';
import {RoundedBoxGeometry} from './vendor/render-addons.js';
import {groundHeight} from './street.js';
// Life and relief in the middle of the square: a stepped granite fountain with a central vasque, a
// falling water curtain and spray (you can bump up the steps and ride through the shallow basin),
// raised planted islands with grindable kerbs, granite bench-ledges around the fountain and darker
// stone bands breaking up the paving. height() feeds the chair physics, so it all rides as it looks.
const F={x:-35,z:4};// Fountain centre.
const RINGS=[[5.4,.19],[5,.38],[4.6,.22]];// Outer step, rim, basin floor (radius, top height).
const WATER=.31;
const ISLANDS=[{x:-50,z:-40,w:8,d:14},{x:50,z:42,w:8,d:14}];const KERB=.45;
const LEDGES=[{x:F.x,z:F.z-8,w:3.4,d:.55},{x:F.x,z:F.z+8,w:3.4,d:.55},{x:F.x-8,z:F.z,w:.55,d:3.4},{x:F.x+8,z:F.z,w:.55,d:3.4}];

function streakTexture(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');g.clearRect(0,0,64,256);
 for(let i=0;i<70;i++){const x=Math.random()*64,w=.6+Math.random()*1.6,a=.15+Math.random()*.45;const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,`rgba(255,255,255,${a})`);gr.addColorStop(.6,`rgba(230,240,245,${a*.6})`);gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(x,Math.random()*60,w,200+Math.random()*56);}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
// Mown grass: fine noisy blades in several greens with a few worn patches.
function grassTexture(base='#4f6b35'){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle=base;g.fillRect(0,0,256,256);
 const greens=['#5d7a3c','#3f5a2b','#6b8546','#48632f','#7a8f4e','#36502a'];for(let i=0;i<9000;i++){g.fillStyle=greens[i%greens.length];g.globalAlpha=.35+Math.random()*.5;const x=Math.random()*256,y=Math.random()*256;g.fillRect(x,y,1,2+Math.random()*3);}
 g.globalAlpha=.12;for(let i=0;i<6;i++){g.fillStyle='#8a7a55';g.beginPath();g.ellipse(Math.random()*256,Math.random()*256,10+Math.random()*25,6+Math.random()*12,Math.random()*3,0,Math.PI*2);g.fill();}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function rippleTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=5;g.beginPath();g.arc(64,64,52,0,Math.PI*2);g.stroke();g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.4)';g.beginPath();g.arc(64,64,40,0,Math.PI*2);g.stroke();return new THREE.CanvasTexture(c);}

export function buildPlaza(scene,obstacles,rails){
 const B=new Builder();
 // Paris fountains and kerbs are pale limestone; the granite scan reads almost navy here.
 const granite=surface('limestone',[1,1],{tileSize:1.4,macro:.1,grime:.8,streaks:.06});granite.color.set('#e9dfcb');granite.normalScale.set(.5,.5);
 const limestone=surface('limestone',[1,1],{tileSize:2,macro:.08,grime:.6,streaks:.1});limestone.color.set('#efe3cc');
 const band=surface('cobble',[1,1],{tileSize:1.1,wet:.4,reflect:true});band.color.set('#b9b2a6');band.userData.ground=true;
 band.polygonOffset=true;band.polygonOffsetFactor=-2;band.polygonOffsetUnits=-2;
 const lawn=new THREE.MeshStandardMaterial({map:grassTexture(),roughness:.95});lawn.map.repeat.set(3,5);
 const hedge=new THREE.MeshStandardMaterial({map:grassTexture('#2f4a24'),roughness:.9});hedge.map.repeat.set(6,1);
 const galv=new THREE.MeshStandardMaterial({color:'#c4c9cc',metalness:1,roughness:.3});
 const bronze=new THREE.MeshStandardMaterial({color:'#3a4a3c',roughness:.38,metalness:.85});
 // Fountain: stepped granite rings, basin floor and a limestone pedestal carrying a bronze vasque.
 const ring=(r0,r1,y0,y1,m)=>{const pts=[[r1,y0],[r1,y1-.02],[r1-.02,y1],[r0+.02,y1],[r0,y1-.02],[r0,y0]].map(([r,y])=>new THREE.Vector2(r,y));B.add(new THREE.LatheGeometry(pts,64),m,F.x,0,F.z,0,0,0,1,1,1,true);};
 ring(5,5.4,0,.19,granite);ring(4.6,5,0,.38,granite);
 B.add(new THREE.CircleGeometry(4.62,64).rotateX(-Math.PI/2),limestone,F.x,.22,F.z,0,0,0,1,1,1,true);
 const ped=[[1.1,.2],[1.1,.32],[.9,.42],[.62,.6],[.5,1.1],[.62,1.25],[.42,1.32]].map(([r,y])=>new THREE.Vector2(r,y));B.add(new THREE.LatheGeometry(ped,40),limestone,F.x,0,F.z,0,0,0,1,1,1,true);
 const vas=[[.42,1.3],[1.2,1.42],[1.62,1.55],[1.66,1.6],[1.5,1.58],[.5,1.48]].map(([r,y])=>new THREE.Vector2(r,y));const vg=new THREE.LatheGeometry(vas,48);B.add(vg,bronze,F.x,0,F.z,0,0,0,1,1,1,true);
 B.add(new THREE.CylinderGeometry(.09,.14,.9,16),bronze,F.x,1.9,F.z,0,0,0,1,1,1,true);B.add(new THREE.SphereGeometry(.16,16,12),bronze,F.x,2.38,F.z,0,0,0,1,1,1,true);
 obstacles.push({x:F.x,z:F.z,w:2.2,d:2.2,h:3,label:'Fountain'});
 // Raised planted islands: granite kerb boxes with lawn tops; their long kerbs are grind lines.
 const treeSpots=[];
 for(const I of ISLANDS){B.add(new RoundedBoxGeometry(I.w,KERB,I.d,3,.05),granite,I.x,KERB/2,I.z,0,0,0,1,1,1,true);B.add(new THREE.PlaneGeometry(I.w-.5,I.d-.5).rotateX(-Math.PI/2),lawn,I.x,KERB+.005,I.z,0,0,0,1,1,1,true);
  // Clipped box hedge just inside the kerb.
  for(const [hx,hz,hw,hd] of [[I.x,I.z-I.d/2+.55,I.w-.9,.5],[I.x,I.z+I.d/2-.55,I.w-.9,.5],[I.x-I.w/2+.55,I.z,.5,I.d-.9],[I.x+I.w/2-.55,I.z,.5,I.d-.9]])B.add(new RoundedBoxGeometry(hw,.55,hd,3,.18),hedge,hx,KERB+.27,hz,0,0,0,1,1,1,true);
  for(const s of [-1,1]){const x=I.x+s*(I.w/2-.12);rails.push({id:`island${I.x}${s}`,ax:x,az:I.z-I.d/2+.3,bx:x,bz:I.z+I.d/2-.3,height:KERB+.12});}
  for(const dz of [-I.d/4,I.d/4])treeSpots.push({x:I.x,z:I.z+dz,y:KERB,scale:.95});
  obstacles.push({x:I.x,z:I.z,w:I.w,d:I.d,h:KERB,label:'Kerb impact'});}
 // Granite bench-ledges around the fountain with a grind line along each top.
 for(const [i,L] of LEDGES.entries()){B.add(new RoundedBoxGeometry(L.w,.45,L.d,3,.04),granite,L.x,.225,L.z,0,0,0,1,1,1,true);const along=L.w>L.d;
  rails.push(along?{id:'fledge'+i,ax:L.x-L.w/2+.2,az:L.z,bx:L.x+L.w/2-.2,bz:L.z,height:.57}:{id:'fledge'+i,ax:L.x,az:L.z-L.d/2+.2,bx:L.x,bz:L.z+L.d/2-.2,height:.57});
  obstacles.push({x:L.x,z:L.z,w:L.w,d:L.d,h:.45,label:'Ledge impact'});
  for(const s of [-1,1])B.add(new THREE.CylinderGeometry(.012,.012,(along?L.w:L.d)-.05,6).rotateZ(along?Math.PI/2:0).rotateX(along?0:Math.PI/2),galv,L.x+(along?0:s*(L.d/2-.01)),.452,L.z+(along?s*(L.d/2-.01):0),0,0,0,1,1,1,true);}
 // Darker granite bands across the paving and a ring of setts around the fountain.
 // Bands are draped over the crowned paving.
 const drape=g=>{const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,groundHeight(p.getX(i),p.getZ(i))+.007);g.computeVertexNormals();};
 for(const x of [-24,24])drape(B.add(new THREE.PlaneGeometry(.6,120,1,120).rotateX(-Math.PI/2),band,x,0,0,0,0,0,1,1,1,true));
 for(const z of [-30,34])drape(B.add(new THREE.PlaneGeometry(116,.6,116,1).rotateX(-Math.PI/2),band,0,0,z,0,0,0,1,1,1,true));
 drape(B.add(new THREE.RingGeometry(5.6,6.4,64,2).rotateX(-Math.PI/2),band,F.x,0,F.z,0,0,0,1,1,1,true));
 B.build(scene).forEach(m=>{m.castShadow=m.receiveShadow=true;});
 // Water: basin surface, the curtain falling from the vasque, the top jet and spray droplets.
 // Fountain water: wind ripples as an animated normal map, Fresnel-bright clear-coat surface.
 const rip=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),img=g.createImageData(256,256),h=(x,y)=>Math.sin(x*.098+Math.sin(y*.062)*2)*.5+Math.sin(y*.148+x*.049)*.35+Math.sin((x-y)*.196)*.15+Math.sin(Math.hypot(x-128,y-128)*.3)*.2;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=h(x+1,y)-h(x-1,y),dy=h(x,y+1)-h(x,y-1),i=(y*256+x)*4;img.data[i]=128+dx*110;img.data[i+1]=128+dy*110;img.data[i+2]=255;img.data[i+3]=255;}g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;})();
 const water=new THREE.MeshPhysicalMaterial({color:'#3f5c5a',roughness:.03,metalness:.1,clearcoat:1,clearcoatRoughness:.02,normalMap:rip,normalScale:new THREE.Vector2(.45,.45),transparent:true,opacity:.9,envMapIntensity:1.6});
 const pool=new THREE.Mesh(new THREE.RingGeometry(1.1,4.62,64).rotateX(-Math.PI/2),water);pool.position.set(F.x,WATER,F.z);scene.add(pool);
 const vasWater=new THREE.Mesh(new THREE.CircleGeometry(1.5,48).rotateX(-Math.PI/2),water);vasWater.position.set(F.x,1.55,F.z);scene.add(vasWater);
 const streaks=streakTexture();const curtainMat=new THREE.MeshStandardMaterial({map:streaks,alphaMap:streaks,transparent:true,opacity:.75,depthWrite:false,side:THREE.DoubleSide,roughness:.1,color:'#e8f2f4',emissive:'#1b2a2e'});
 const curtain=new THREE.Mesh(new THREE.CylinderGeometry(1.66,1.95,1.25,48,1,true),curtainMat);curtain.position.set(F.x,1.58-1.25/2+.02,F.z);scene.add(curtain);
 const jetMat=curtainMat.clone();jetMat.map=streaks.clone();jetMat.alphaMap=jetMat.map;jetMat.map.repeat.set(1,.5);
 const jet=new THREE.Mesh(new THREE.CylinderGeometry(.03,.07,1.1,12,1,true),jetMat);jet.position.set(F.x,3.0,F.z);scene.add(jet);
 const N=900,pos=new Float32Array(N*3),seed=Array.from({length:N},()=>({a:Math.random()*Math.PI*2,t:Math.random(),k:Math.random()}));
 const drops=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(pos,3)),new THREE.PointsMaterial({color:'#f2fbff',size:.05,transparent:true,opacity:.75,depthWrite:false}));scene.add(drops);
 const ripTex=rippleTexture(),ripples=Array.from({length:14},()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:ripTex,transparent:true,depthWrite:false,opacity:0}));m.position.set(F.x,WATER+.01,F.z);m.userData.t=Math.random();scene.add(m);return m;});
 for(const o of [pool,vasWater,curtain,jet,drops,...ripples])o.traverse(x=>{x.userData.static=true;x.castShadow=false;});
 const update=(dt,now)=>{streaks.offset.y=-now*.9;rip.offset.set(now*.03,now*.021);jetMat.map.offset.y=-now*1.6;
  const p=drops.geometry.attributes.position;for(let i=0;i<N;i++){const s=seed[i];s.t+=dt*(i<300?.8:1.1);if(s.t>1){s.t-=1;s.a=Math.random()*Math.PI*2;s.k=Math.random();}
   let x,y,r;if(i<300){const t=s.t*1.1,v=4.2+s.k*.8;r=.05+t*(.9+s.k*.6);y=2.4+v*t-4.9*t*t;if(y<1.56){y=1.56;}}else{const t=s.t*.55;r=1.66+t*(.5+s.k*.4);y=1.56-4.9*t*t;if(y<WATER){y=WATER+.05*s.k;r+=.1;}}
   x=F.x+Math.cos(s.a)*r;p.setXYZ(i,x,y,F.z+Math.sin(s.a)*r);}p.needsUpdate=true;
  for(const m of ripples){m.userData.t+=dt*.45;if(m.userData.t>1){m.userData.t-=1;const a=Math.random()*Math.PI*2,r=1.9+Math.random()*.5;m.position.x=F.x+Math.cos(a)*r;m.position.z=F.z+Math.sin(a)*r;}const t=m.userData.t;m.scale.setScalar(.2+t*1.4);m.material.opacity=(1-t)*.5;}};
 // Ride heights: fountain steps, shallow basin, islands and ledges.
 const height=(x,z)=>{let h=0;const r=Math.hypot(x-F.x,z-F.z);if(r<5.4)h=r>5?RINGS[0][1]:r>4.6?RINGS[1][1]:RINGS[2][1];
  for(const I of ISLANDS)if(Math.abs(x-I.x)<I.w/2&&Math.abs(z-I.z)<I.d/2)h=Math.max(h,KERB);
  for(const L of LEDGES)if(Math.abs(x-L.x)<L.w/2&&Math.abs(z-L.z)<L.d/2)h=Math.max(h,.45);return h;};
 const wet=(x,z)=>Math.hypot(x-F.x,z-F.z)<4.6;
 return {height,wet,update,treeSpots,footprints:[{x:F.x,z:F.z,w:10.8,d:10.8},...ISLANDS,...LEDGES]};}
