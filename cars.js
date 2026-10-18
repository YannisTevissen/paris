import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {roadHeight} from './street.js';
// Parallel-parked Paris cars. Bodies are lofted shells (cross-sections along the length) so the
// panels curve and clear-coat reflections roll across them; glass cabins lean inwards.
let seed=777;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const lerpPts=(pts,x)=>{if(x<=pts[0][0])return pts[0][1];for(let i=1;i<pts.length;i++)if(x<=pts[i][0]){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];return y0+(y1-y0)*(x-x0)/(x1-x0);}return pts[pts.length-1][1];};
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const TYPES={
 hatch:{L:4.05,W:1.78,top:[[0,.6],[.06,.86],[.2,.98],[.4,1],[2.8,.96],[3.7,.83],[3.98,.68],[4.05,.5]],cab:[.36,2.95],roof:[[.36,1],[.62,1.42],[1,1.48],[2.1,1.48],[2.35,1.43],[2.95,.97]]},
 saloon:{L:4.55,W:1.8,top:[[0,.66],[.05,.86],[.2,.97],[1.05,.99],[3.25,.96],[4.2,.82],[4.5,.66],[4.55,.5]],cab:[1.05,3.25],roof:[[1.05,.99],[1.45,1.38],[1.75,1.44],[2.65,1.44],[2.85,1.39],[3.25,.96]]},
 van:{L:4.35,W:1.84,top:[[0,.62],[.04,1.02],[.12,1.08],[3.1,1.08],[3.9,.92],[4.3,.7],[4.35,.5]],cab:[.12,3.2],roof:[[.12,1.08],[.16,1.8],[.32,1.86],[2.55,1.86],[2.75,1.8],[3.2,1.07]]}};
// Loft rings: one side outline from bottom centre to top centre, mirrored to the other side.
function loft(stations,ring){const pos=[],idx=[];let m=0;const rings=[];for(const x of stations){const side=ring(x);const full=[...side,...side.slice(0,-1).reverse().map(([z,y])=>[-z,y])];m=full.length;rings.push(full);for(const [z,y] of full)pos.push(x,y,z);}
 const n=stations.length;for(let i=0;i<n-1;i++)for(let j=0;j<m-1;j++){const a=i*m+j,b=a+m;idx.push(a,b,a+1,b,b+1,a+1);}
 // End caps get their own vertices so their flat normals do not bend the shell's shading.
 for(const [i,out] of [[0,-1],[n-1,1]]){const x=stations[i],ring=rings[i],base=pos.length/3;const cy=ring.reduce((t,p)=>t+p[1],0)/ring.length;pos.push(x,cy,0);for(const [z,y] of ring)pos.push(x,y,z);
  const tri=[];for(let j=0;j<m-1;j++)tri.push([base,base+1+j,base+2+j]);const [p0,p1,p2]=tri[1].map(k=>new THREE.Vector3(pos[k*3],pos[k*3+1],pos[k*3+2]));const nx=p1.clone().sub(p0).cross(p2.clone().sub(p0)).x;for(const t of tri)idx.push(...(nx*out>=0?t:[t[0],t[2],t[1]]));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function body(T){const L=T.L,hw=x=>T.W/2*(1-.09*Math.pow(1-smooth(0,.55,x)*smooth(L,L-.7,x),1.4)),wheels=[.8,L-.82];
 const bottom=x=>{let y=.24;for(const c of wheels){const d=Math.abs(x-c);if(d<.39)y=Math.max(y,.31+Math.sqrt(.39*.39-d*d));}return y+.12*(1-smooth(0,.12,x))+.14*(1-smooth(L,L-.14,x));};
 const st=[];for(let i=0;i<=56;i++)st.push(L*i/56);
 const shell=loft(st,x=>{const yb=bottom(x),yt=lerpPts(T.top,x),w=hw(x),h=Math.max(.02,yt-yb);const f=[[0,.9],[.12,.985],[.32,1],[.55,.995],[.75,.975],[.9,.93],[1,.82]];return [[0,yb],...f.map(([s,k])=>[w*k,yb+h*s]),[w*.5,yt+.025],[0,yt+.03]];});
 const [c0,c1]=T.cab,cs=[];for(let i=0;i<=24;i++)cs.push(c0+(c1-c0)*i/24);
 const cabin=loft(cs,x=>{const yb=lerpPts(T.top,x)-.02,yt=Math.max(yb+.01,lerpPts(T.roof,x)),w=hw(x)*.9;return [[0,yb],[w,yb],[w*.93,yb+(yt-yb)*.5],[w*.84,yt-.04],[w*.6,yt],[0,yt+.012]];});
 const rx=T.roof.filter(p=>p[1]>Math.max(...T.roof.map(q=>q[1]))-.07).map(p=>p[0]),rs=[];for(let i=0;i<=12;i++)rs.push(rx[0]-.04+(rx[rx.length-1]-rx[0]+.08)*i/12);
 const roof=loft(rs,x=>{const yt=lerpPts(T.roof,x)+.012,w=hw(x)*.9;return [[0,yt-.03],[w*.8,yt-.03],[w*.82,yt-.012],[w*.62,yt+.008],[0,yt+.02]];});
 return {shell,cabin,roof,hw,wheels};}
function plateTexture(){const c=document.createElement('canvas');c.width=256;c.height=56;const g=c.getContext('2d');g.fillStyle='#f4f4f0';g.fillRect(0,0,256,56);g.fillStyle='#1f3f9f';g.fillRect(0,0,26,56);g.fillRect(230,0,26,56);g.fillStyle='#111';g.font='bold 34px "DIN Alternate","Arial Narrow",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('GT-075-PR',128,30);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
let SHARED=null;const shared=()=>SHARED||(SHARED=materials());
function materials(){const paints=['#ecebe8','#c4c7ca','#80868b','#1b1d20','#1f2d48','#87191e','#d6d0c1','#3a463c','#2c2e31'].map(c=>new THREE.MeshPhysicalMaterial({color:c,metalness:.45,roughness:.32,clearcoat:1,clearcoatRoughness:.04}));
 return {paints,glass:new THREE.MeshPhysicalMaterial({color:'#0a0d10',roughness:.03,metalness:.5,clearcoat:1,side:THREE.DoubleSide}),trim:new THREE.MeshStandardMaterial({color:'#111214',roughness:.55}),well:new THREE.MeshStandardMaterial({color:'#060606',roughness:.9,side:THREE.DoubleSide}),tyre:new THREE.MeshStandardMaterial({color:'#18191a',roughness:.9}),
  rim:new THREE.MeshStandardMaterial({color:'#9aa0a5',roughness:.28,metalness:1}),hub:new THREE.MeshStandardMaterial({color:'#2a2d30',roughness:.4,metalness:.8}),head:new THREE.MeshPhysicalMaterial({color:'#cfd5d9',roughness:.04,metalness:.3,clearcoat:1}),tail:new THREE.MeshStandardMaterial({color:'#4a0b0b',emissive:'#a3140e',emissiveIntensity:.3,roughness:.2}),plate:new THREE.MeshStandardMaterial({map:plateTexture(),roughness:.4})};}
const geo={};const WELL=new THREE.CylinderGeometry(.4,.4,.42,18,1,true,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2);
// Blender-modelled cars (tools/paris_cars.py): smooth subdivided bodies at real sizes. Their parts are
// flattened into the same per-material batches as before; paint, glass and plates use the shared
// materials so every car can take its own colour.
const MODEL_OF={hatch:'supermini',saloon:'saloon',van:'van'},MODELS={};
export async function loadCarModels(){const {loadGLB}=await import('./models.js');await Promise.all(Object.values(MODEL_OF).map(async k=>{try{const g=await loadGLB(`./assets/models/cars/${k}.glb`);g.scene.updateMatrixWorld(true);const parts=[];
 g.scene.traverse(o=>{if(!o.isMesh)return;const geo=o.geometry.clone();geo.applyMatrix4(o.matrixWorld);parts.push({geo,mat:o.material,role:/paint/.test(o.material.name)?'paint':/glass/.test(o.material.name)?'glass':/plate/.test(o.material.name)?'plate':''});});
 const box=new THREE.Box3();for(const p of parts){p.geo.computeBoundingBox();box.union(p.geo.boundingBox);}MODELS[k]={parts,L:box.max.z-box.min.z};}catch(e){console.warn('Car model unavailable',k,e);}}));
 for(const [t,k] of Object.entries(MODEL_OF))if(MODELS[k])TYPES[t].L=MODELS[k].L;}
function car(B,M,x,z,ry,type,paint,y=0){const T=TYPES[type];const Mo=MODELS[MODEL_OF[type]];
 if(Mo){B.push(x,y,z,ry+Math.PI/2);for(const p of Mo.parts)B.add(p.geo,p.role==='paint'?paint:p.role==='glass'?M.glass:p.role==='plate'?M.plate:p.mat,0,0,0);B.pop();return T.L;}const G=geo[type]||(geo[type]=body(T));B.push(x,y,z,ry);B.push(-T.L/2,0,0);
 B.add(G.shell,paint);B.add(G.cabin,M.glass);B.add(G.roof,paint);
 const up=new THREE.Vector3(0,1,0),beam=(a,b,r,m)=>{const A=new THREE.Vector3(...a),E=new THREE.Vector3(...b),d=E.clone().sub(A),e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up,d.clone().normalize()));B.add(new THREE.CylinderGeometry(r,r,d.length(),6),m,(A.x+E.x)/2,(A.y+E.y)/2,(A.z+E.z)/2,e.x,e.y,e.z);};
 const [c0,c1]=T.cab,rp=T.roof,top=x=>lerpPts(T.top,x),roofY=x=>lerpPts(rp,x);
 for(const s of [-1,1]){const zb=x=>s*G.hw(x)*.9,zt=x=>s*G.hw(x)*.9*.62;
  beam([c1,top(c1)-.01,zb(c1)*.98],[rp[rp.length-2][0],roofY(rp[rp.length-2][0])-.01,zt(rp[rp.length-2][0])*1.25],.045,paint);beam([c0+.02,top(c0),zb(c0)*.98],[rp[1][0],roofY(rp[1][0])-.01,zt(rp[1][0])*1.25],.06,paint);
  const bx=(c0+c1)/2+(type==='van'?.3:.05);beam([bx,top(bx),zb(bx)*.99],[bx-.04,roofY(bx)-.01,zt(bx)*1.3],.05,paint);
  for(const wx of G.wheels){B.add(WELL,M.well,wx,.31,s*(T.W/2-.25));
   B.add(new THREE.TorusGeometry(.225,.09,12,28),M.tyre,wx,.31,s*(T.W/2-.18),0,0,0,1,1,1.25);B.add(new THREE.CylinderGeometry(.19,.19,.05,24),M.hub,wx,.31,s*(T.W/2-.14),Math.PI/2);
   for(let k=0;k<5;k++){const a=k/5*Math.PI*2;B.box(.035,.17,.03,M.rim,wx+Math.sin(a)*.09,.31+Math.cos(a)*.09,s*(T.W/2-.11),0,0,-a);}B.add(new THREE.CylinderGeometry(.05,.05,.06,12),M.rim,wx,.31,s*(T.W/2-.105),Math.PI/2);}
  B.box(.13,.09,.11,paint,c1-.12,top(c1)+.07,s*(G.hw(c1)+.05));B.box(.22,.022,.025,M.trim,(c0+c1)/2+.5,top((c0+c1)/2)-.13,s*(G.hw((c0+c1)/2)*.995+.004));
  B.box(.08,.09,.36,M.head,T.L-.12,lerpPts(T.top,T.L-.12)-.1,s*.56,0,0,-.3);B.box(.05,.12,.3,M.tail,.04,lerpPts(T.top,.04)-.12,s*.62,0,0,.25);}
 B.box(.05,.16,1.1,M.trim,T.L-.03,.4,0);B.box(.05,.12,1.3,M.trim,.03,.42,0);B.box(.03,.12,.52,M.plate,-.01,.56,0);B.box(.03,.12,.52,M.plate,T.L+.005,.4,0);B.box(T.L-.6,.12,T.W-.4,M.trim,T.L/2,.3,0);
 B.pop();B.pop();return T.L;}
export function parkCars(scene,obstacles){const M=shared(),B=new Builder();const types=['hatch','hatch','hatch','saloon','saloon','van'];
 for(const s of [-1,1]){let x=-124;while(x<122){const type=types[Math.floor(rand()*types.length)],L=TYPES[type].L;const cx=x+L/2;
  const blocked=[-66,0,66].some(c=>Math.abs(cx-c)<L/2+3.2)||(s<0&&Math.abs(cx)<31)||rand()<.12;if(!blocked){const z=s*77.75+(rand()-.5)*.12,ry=(s>0?0:Math.PI)+(rand()-.5)*.03;car(B,M,cx,z,ry,type,M.paints[Math.floor(rand()*M.paints.length)],roadHeight(cx,z));obstacles.push({x:cx,z,w:L,d:1.9,h:type==='van'?1.9:1.5,label:'Parked car impact'});}
  x+=L+.7+rand()*1.6;}}
 B.build(scene);return [...M.paints,M.glass,M.rim,M.head];}

// Moving traffic: right-hand lanes on both avenues, simple car-following that brakes for the
// car ahead and for the chair, wrapping at the ends of the street. Each car is a moving obstacle.
export function createTraffic(scene,obstacles){const M=shared(),types=['hatch','saloon','hatch','van','saloon'];const lanes=[{z:74.5,dir:1},{z:68.5,dir:-1},{z:-68.5,dir:1},{z:-74.5,dir:-1}];const cars=[];
 lanes.forEach((lane,li)=>{for(let k=0;k<3;k++){const type=types[(li*3+k)%types.length],group=new THREE.Group(),B=new Builder();car(B,M,0,0,0,type,M.paints[Math.floor(rand()*M.paints.length)]);B.build(group);group.traverse(o=>{o.userData.static=true;});scene.add(group);
  const c={group,lane,type,L:TYPES[type].L,x:-120+k*82+li*17+rand()*10,speed:9+rand()*3,cruise:9+rand()*3.5};c.ob={x:c.x,z:lane.z,w:c.L,d:1.9,h:1.6,label:'Car impact'};obstacles.push(c.ob);cars.push(c);}});
 return (dt,player)=>{for(const c of cars){const d=c.lane.dir;let target=c.cruise;
  for(const o of cars)if(o!==c&&o.lane===c.lane){let gap=(o.x-c.x)*d;if(gap<-130)gap+=260;if(gap>0&&gap<16)target=Math.min(target,Math.max(0,(gap-c.L/2-o.L/2-2.5)*1.3));}
  const ahead=(player.x-c.x)*d;if(Math.abs(player.z-c.lane.z)<2.4&&ahead>0&&ahead<18)target=Math.min(target,Math.max(0,(ahead-c.L/2-2.2)*1.1));
  c.speed+=Math.max(-8*dt,Math.min(3*dt,target-c.speed));c.x+=d*c.speed*dt;if(c.x*d>132)c.x-=d*264;
  c.group.position.set(c.x,roadHeight(0,c.lane.z),c.lane.z);c.group.rotation.y=d>0?0:Math.PI;c.ob.x=c.x;}};}
