import * as THREE from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/render-addons.js';
import {surface,worldUV} from './materials.js';
import {mergeGeometries} from './vendor/jsm/utils/BufferGeometryUtils.js';
// Six-wheel mid-drive power chair and an articulated seated rider. Wheel and chassis positions
// match the physics support edges (track ±0.59, front 0.87, rear -0.55, chassis underside 0.29).
const up=new THREE.Vector3(0,1,0);
function mesh(geo,mat,parent,x=0,y=0,z=0,rx=0,ry=0,rz=0){if(mat.userData.scanned)worldUV(geo,mat.userData.tileSize);const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const rbox=(w,h,d,r,mat,parent,x,y,z,rx=0,ry=0,rz=0)=>mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2)),mat,parent,x,y,z,rx,ry,rz);
function orient(m,a,b){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);m.position.copy(A);m.quaternion.setFromUnitVectors(up,B.sub(A).normalize());return m;}
function tube(a,b,r,mat,parent,seg=12){const len=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));const g=new THREE.CylinderGeometry(r,r,len,seg);g.translate(0,len/2,0);return orient(mesh(g,mat,parent),a,b);}
// Tapered body segment: a lathe profile [t along the bone, radius] laid between two joints.
function limb(a,b,radii,mat,parent,sx=1,sz=1){const len=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));const pts=[new THREE.Vector2(0,-radii[0][1]*.6),...radii.map(([t,r])=>new THREE.Vector2(r,t*len)),new THREE.Vector2(0,len+radii[radii.length-1][1]*.6)];const m=orient(mesh(new THREE.LatheGeometry(pts,18),mat,parent),a,b);m.scale.set(sx,1,sz);return m;}
function spring(a,b,radius,turns,wire,mat,parent){const len=new THREE.Vector3(...a).distanceTo(new THREE.Vector3(...b));const curve=new (class extends THREE.Curve{getPoint(t,v=new THREE.Vector3()){const k=t*turns*Math.PI*2;return v.set(Math.cos(k)*radius,t*len,Math.sin(k)*radius);}})();return orient(mesh(new THREE.TubeGeometry(curve,turns*14,wire,6),mat,parent),a,b);}
// Merge a group's direct mesh children by material; moving parts stay as their own groups.
function mergeChildren(group){const by=new Map();for(const c of [...group.children]){if(!c.isMesh||c.children.length||c.material.isMeshBasicMaterial)continue;c.updateMatrix();const g=c.geometry.index?c.geometry.toNonIndexed():c.geometry.clone();g.applyMatrix4(c.matrix);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));if(!by.has(c.material))by.set(c.material,[]);by.get(c.material).push(g);group.remove(c);}
 for(const [mat,list] of by){const merged=mergeGeometries(list,false);if(!merged)continue;const m=new THREE.Mesh(merged,mat);m.castShadow=m.receiveShadow=true;group.add(m);}}
function canvasTexture(w,h,draw,color=true){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);if(color)t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;}

function textures(){
 // Tyre tread: chevron lugs across the crown, smooth sidewalls.
 const tread=canvasTexture(512,128,(g,w,h)=>{g.fillStyle='#808080';g.fillRect(0,0,w,h);g.fillStyle='#262626';for(let x=0;x<w;x+=32){g.beginPath();g.moveTo(x,0);g.lineTo(x+14,h*.5);g.lineTo(x,h);g.lineTo(x+9,h);g.lineTo(x+23,h*.5);g.lineTo(x+9,0);g.fill();}g.fillStyle='#808080';g.fillRect(0,h*.2,w,h*.6);},false);tread.repeat.set(16,1);
 const knit=canvasTexture(256,256,(g,w,h)=>{g.fillStyle='#777';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8)for(let x=0;x<w;x+=8){g.fillStyle=(x/8)%2?'#999':'#555';g.beginPath();g.ellipse(x+4,y+4,2.6,4.4,((x/8)%2?.5:-.5),0,7);g.fill();}},false);knit.repeat.set(10,4);
 // Face on the sphere UVs (u = 0.25 faces +z): skin grain, brows, stubble, lips and nose shading.
 const face=canvasTexture(1024,512,(g,w,h)=>{g.fillStyle='#b98063';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){g.fillStyle=Math.random()<.5?'rgba(120,60,45,.05)':'rgba(255,215,190,.05)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}
  const cx=256;g.fillStyle='rgba(150,80,70,.3)';g.beginPath();g.ellipse(cx,300,56,30,0,0,7);g.fill();
  g.fillStyle='rgba(55,36,28,.5)';for(let i=0;i<2600;i++){const a=Math.random()*Math.PI,r=55+Math.random()*32;g.fillRect(cx+Math.cos(a)*r*1.05,296+Math.sin(a)*r*.78,1.5,1.5);}
  g.strokeStyle='#3b2318';g.lineWidth=7;g.lineCap='round';for(const s of [-1,1]){g.beginPath();g.moveTo(cx+s*14,228);g.quadraticCurveTo(cx+s*34,218,cx+s*56,226);g.stroke();}
  g.fillStyle='#7a3f35';g.beginPath();g.ellipse(cx,318,24,6,0,0,7);g.fill();g.fillStyle='rgba(60,25,20,.6)';g.fillRect(cx-22,317,44,2);
  g.fillStyle='rgba(110,60,45,.3)';g.beginPath();g.ellipse(cx,282,9,16,0,0,7);g.fill();});
 return {tread,knit,face};}

function wheel(M,parent,x,r,z,width,spokes){const g=new THREE.Group();g.position.set(x,r,z);g.userData.r=r;parent.add(g);const side=Math.sign(x)||1;
 const tire=mesh(new THREE.TorusGeometry(r-width*.38,width*.38,16,48),M.tire,g,0,0,0,0,Math.PI/2,0);tire.scale.set(1,1,1.3);
 mesh(new THREE.CylinderGeometry(r*.6,r*.6,width*.78,32),M.rimDark,g,0,0,0,0,0,Math.PI/2);
 mesh(new THREE.CylinderGeometry(r*.62,r*.62,width*.12,32,1,true),M.rim,g,side*width*.36,0,0,0,0,Math.PI/2);
 for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2;const s=mesh(new RoundedBoxGeometry(width*.16,r*.44,r*.15,2,.012),M.rim,g,side*width*.36,Math.cos(a)*r*.36,Math.sin(a)*r*.36,a,0,0);s.castShadow=false;}
 mesh(new THREE.CylinderGeometry(r*.24,r*.28,width*.42,24),M.rim,g,side*width*.3,0,0,0,0,Math.PI/2);mesh(new THREE.CylinderGeometry(r*.12,r*.12,width*.46,16),M.badge,g,side*width*.31,0,0,0,0,Math.PI/2);
 return g;}
// Castor: swivel housing on the arm, trailing fork and small wheel. The fork group yaws with travel.
function caster(M,parent,x,z,r,trail){const pivot=new THREE.Group();pivot.position.set(x,r+.17,z);parent.add(pivot);mesh(new THREE.CylinderGeometry(.035,.035,.08,14),M.alu,pivot,0,.03,0);
 const fork=new THREE.Group();pivot.add(fork);for(const s of [-1,1])rbox(.016,.2,.07,.006,M.dark,fork,s*.05,-.08,-trail*.6);rbox(.12,.025,.08,.01,M.dark,fork,0,.01,-trail*.3);
 const w=wheel(M,fork,0,r,-trail,.075,4);w.position.y=-.17;return {pivot,fork,wheel:w,x,z,angle:0};}

// Blender-modelled chair (assets/models/power_chair): static chassis plus wheel, castor and fork
// templates that are cloned into the same spinning/swivelling groups the procedural chair used.
// Real Permobil F5 Corpus scale: 650 mm wide, 14-inch drive wheels, seat about 0.5 m up.
export const CHAIR={driveX:.275,driveR:.175,casterX:.2,casterR:.09,front:.38,rear:-.36,seat:[0,.6,-.04],edge:{side:.32,front:.38,rear:-.4,air:.5},radius:.5};
function modelledChair(gltf,rig){const root=gltf.scene;const take=n=>{const o=root.getObjectByName(n);o.removeFromParent();o.position.set(0,0,0);return o;};
 const drive=take('drive_wheel'),rear=take('castor_rear'),front=take('castor_front'),forkT=take('castor_fork');rig.add(root);
 const shade=o=>o.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;}});shade(root);
 const wheels=[],casters=[];for(const s of [-1,1]){const w=drive.clone();w.position.set(s*CHAIR.driveX,CHAIR.driveR,0);if(s<0)w.scale.x=-1;w.userData.r=CHAIR.driveR;shade(w);rig.add(w);wheels.push(w);
  for(const [z,r,trail,tmpl] of [[CHAIR.rear,CHAIR.casterR,.04,rear],[CHAIR.front,CHAIR.casterR,.04,front]]){const pivot=new THREE.Group();pivot.position.set(s*CHAIR.casterX,r+.11,z);rig.add(pivot);const fork=new THREE.Group();pivot.add(fork);const f=forkT.clone();shade(f);fork.add(f);
   const wh=tmpl.clone();wh.position.set(0,-.11,-trail);if(s<0)wh.scale.x=-1;wh.userData.r=r;shade(wh);fork.add(wh);wheels.push(wh);casters.push({pivot,fork,wheel:wh,x:s*CHAIR.casterX,z,angle:0});}}
 return {wheels,casters};}

export function buildAvatar(scene,chairModel=null,riderModel=null){const T=textures();
 const M={paint:new THREE.MeshPhysicalMaterial({color:'#1b2531',metalness:.5,roughness:.3,clearcoat:1,clearcoatRoughness:.05}),
  lime:new THREE.MeshStandardMaterial({color:'#d4f45a',emissive:'#9bc12a',emissiveIntensity:.55,roughness:.35}),
  plastic:new THREE.MeshStandardMaterial({color:'#15181b',roughness:.6,metalness:.05}),dark:new THREE.MeshStandardMaterial({color:'#101214',roughness:.45,metalness:.7}),
  tire:new THREE.MeshStandardMaterial({color:'#1a1b1c',roughness:.88,bumpMap:T.tread,bumpScale:3}),rim:new THREE.MeshStandardMaterial({color:'#c9ced2',roughness:.22,metalness:1}),rimDark:new THREE.MeshStandardMaterial({color:'#24292d',roughness:.35,metalness:.9}),
  badge:new THREE.MeshStandardMaterial({color:'#d4f45a',roughness:.3,metalness:.4}),alu:new THREE.MeshStandardMaterial({color:'#aab0b5',roughness:.3,metalness:1}),chrome:new THREE.MeshStandardMaterial({color:'#e6e9eb',roughness:.08,metalness:1}),
  spring:new THREE.MeshStandardMaterial({color:'#d4f45a',roughness:.35,metalness:.6}),leather:surface('leather'),fabric:surface('fabric',[1,1],{tileSize:.5}),
  led:new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#e8f4ff',emissiveIntensity:3}),tail:new THREE.MeshStandardMaterial({color:'#400',emissive:'#ff2a1a',emissiveIntensity:2}),amber:new THREE.MeshStandardMaterial({color:'#5a3200',emissive:'#ff8a1a',emissiveIntensity:.6}),
  screen:new THREE.MeshStandardMaterial({color:'#05070a',emissive:'#5fd0ff',emissiveIntensity:1.1,roughness:.12}),guard:new THREE.MeshStandardMaterial({color:'#20262c',roughness:.15,transparent:true,opacity:.55})};
 M.leather.color.set('#1e2228');M.fabric.color.set('#2c3138');M.paintBoth=M.paint.clone();M.paintBoth.side=THREE.DoubleSide;
 const player=new THREE.Group();scene.add(player);const rig=new THREE.Group();player.add(rig);
 let wheels=[],casters=[];if(chairModel)({wheels,casters}=modelledChair(chairModel,rig));else{
 // Power base: sculpted shell, skirts, bumpers, lights, battery tray and wheel arches.
 rbox(.84,.22,1.2,.09,M.paint,rig,0,.43,.02);rbox(.7,.1,.82,.05,M.paint,rig,0,.56,-.02);rbox(.62,.12,.24,.05,M.paint,rig,0,.5,.56,-.35);rbox(.66,.14,.2,.05,M.paint,rig,0,.5,-.52,.3);
 rbox(.9,.06,1.26,.025,M.plastic,rig,0,.315,.02);rbox(.6,.1,.7,.03,M.dark,rig,0,.33,-.02);
 for(const s of [-1,1]){rbox(.05,.05,.92,.02,M.lime,rig,s*.43,.47,.02);mesh(new THREE.CylinderGeometry(.37,.37,.24,32,1,true,-Math.PI*.08,Math.PI*1.16),M.paintBoth,rig,s*.59,.31,.36,0,0,Math.PI/2);
  rbox(.08,.035,.05,.012,M.led,rig,s*.28,.45,.66);rbox(.07,.04,.03,.012,M.tail,rig,s*.3,.48,-.63);rbox(.02,.04,.07,.01,M.amber,rig,s*.455,.4,.5);rbox(.02,.04,.07,.01,M.amber,rig,s*.455,.4,-.45);rbox(.12,.16,.015,.005,M.plastic,rig,s*.59,.17,.08);}
 rbox(.78,.08,.1,.035,M.plastic,rig,0,.37,.67);rbox(.78,.08,.1,.035,M.plastic,rig,0,.37,-.62);
 // Independent swing arms with coil-over shocks, and castor arms front and rear.
 for(const s of [-1,1]){tube([s*.42,.36,.05],[s*.5,.31,.36],.028,M.dark,rig);tube([s*.42,.42,.62],[s*.5,.31,.36],.024,M.dark,rig);spring([s*.4,.36,.2],[s*.4,.58,.12],.04,7,.008,M.spring,rig);tube([s*.4,.33,.2],[s*.4,.6,.11],.012,M.chrome,rig);
  tube([s*.36,.4,.55],[s*.52,.33,.84],.026,M.alu,rig);tube([s*.36,.4,-.45],[s*.52,.38,-.52],.026,M.alu,rig);}
 for(const s of [-1,1]){wheels.push(wheel(M,rig,s*.59,.31,.36,.2,6));
  for(const [z,r,trail] of [[-.52,.17,.07],[.84,.13,.05]]){const c=caster(M,rig,s*.52,z,r,trail);casters.push(c);wheels.push(c.wheel);}}
 // Seat lift, tilt actuator and contoured seating.
 mesh(new THREE.CylinderGeometry(.1,.11,.14,24),M.dark,rig,0,.63,-.05);mesh(new THREE.CylinderGeometry(.075,.075,.1,24),M.chrome,rig,0,.72,-.05);tube([0,.6,-.36],[0,.74,-.2],.03,M.dark,rig);tube([0,.66,-.29],[0,.76,-.16],.014,M.chrome,rig);
 for(const s of [-1,1])rbox(.04,.04,.58,.012,M.alu,rig,s*.2,.77,-.01);rbox(.56,.03,.58,.01,M.dark,rig,0,.795,-.01);
 rbox(.52,.11,.52,.05,M.leather,rig,0,.86,0);rbox(.4,.03,.4,.012,M.fabric,rig,0,.92,.02);for(const s of [-1,1])rbox(.07,.06,.48,.03,M.leather,rig,s*.235,.93,0);
 const back=new THREE.Group();back.position.set(0,.88,-.27);back.rotation.x=-.12;rig.add(back);
 rbox(.5,.64,.06,.03,M.plastic,back,0,.36,-.05);rbox(.46,.6,.09,.045,M.leather,back,0,.37,.02);rbox(.34,.46,.03,.015,M.fabric,back,0,.4,.07);
 for(const s of [-1,1]){rbox(.06,.24,.14,.03,M.leather,back,s*.25,.48,.07,0,s*.3,0);tube([s*.22,.5,-.02],[s*.25,.48,.02],.012,M.alu,back);}
 tube([0,.66,-.08],[0,.86,-.06],.016,M.alu,back);rbox(.3,.15,.1,.05,M.leather,back,0,.92,0);rbox(.04,.12,.06,.02,M.plastic,back,0,.86,-.06);
 for(const s of [-1,1]){tube([s*.3,.8,-.2],[s*.3,1.04,-.18],.018,M.alu,rig);tube([s*.3,.8,.15],[s*.3,1.0,.15],.015,M.alu,rig);rbox(.09,.06,.44,.03,M.leather,rig,s*.3,1.065,-.02);rbox(.012,.16,.4,.006,M.guard,rig,s*.275,.98,-.02);}
 // Joystick module on a swing-away arm: control box, live display, gaiter and knob.
 tube([.3,1.04,.2],[.31,1.06,.27],.012,M.alu,rig);rbox(.1,.05,.15,.02,M.plastic,rig,.31,1.09,.27);mesh(new THREE.BoxGeometry(.065,.002,.05),M.screen,rig,.31,1.116,.24);for(let i=0;i<3;i++)mesh(new THREE.CylinderGeometry(.007,.007,.006,10),M.lime,rig,.285+i*.025,1.117,.21);
 mesh(new THREE.ConeGeometry(.022,.035,14),M.plastic,rig,.31,1.13,.3);tube([.31,1.13,.3],[.31,1.18,.305],.007,M.dark,rig);mesh(new THREE.SphereGeometry(.024,16,12),M.plastic,rig,.31,1.19,.307);
 // Centre-mount leg rest, calf pad and split footplate.
 tube([0,.78,.25],[0,.42,.62],.025,M.alu,rig);for(const s of [-1,1]){tube([s*.03,.5,.54],[s*.14,.35,.66],.016,M.alu,rig);rbox(.2,.025,.26,.01,M.alu,rig,s*.12,.335,.7,-.08);for(let i=0;i<5;i++)mesh(new THREE.BoxGeometry(.18,.006,.012),M.dark,rig,s*.12,.352,.61+i*.045);}
 rbox(.3,.16,.05,.025,M.leather,rig,0,.6,.5,-.45);}
 // Rider: pelvis -> spine -> neck -> head; arms hang from the spine so they sway with the torso.
 const skin=new THREE.MeshPhysicalMaterial({color:'#b98063',roughness:.52,sheen:.45,sheenColor:new THREE.Color('#ff9f80'),sheenRoughness:.55});
 const faceMat=skin.clone();faceMat.map=T.face;faceMat.color.set('#ffffff');
 // Cotton fleece: the denim scan's weave and roughness without its blue colour.
 const hoodie=surface('fabric',[1,1],{tileSize:.25});hoodie.map=null;hoodie.color.set('#c3c9ad');hoodie.roughness=1;hoodie.normalScale.set(.35,.35);const pants=surface('fabric',[1,1],{tileSize:.4});pants.color.set('#3f5266');
 const shoe=new THREE.MeshStandardMaterial({color:'#ecebe4',roughness:.55}),sole=new THREE.MeshStandardMaterial({color:'#c9b48a',roughness:.85}),beanie=new THREE.MeshStandardMaterial({color:'#2a2d33',roughness:.95,bumpMap:T.knit,bumpScale:2.5}),
  lens=new THREE.MeshPhysicalMaterial({color:'#07090b',roughness:.04,metalness:.7,clearcoat:1}),string=new THREE.MeshStandardMaterial({color:'#f2f2ea',roughness:.7});
 const rider=new THREE.Group();rig.add(rider);const root=new THREE.Group();root.position.set(0,.97,-.03);rider.add(root);
 const pelvis=mesh(new THREE.SphereGeometry(.15,24,16),pants,root,0,0,0);pelvis.scale.set(1.25,.75,1);
 for(const s of [-1,1]){limb([s*.1,-.02,.02],[s*.12,-.04,.43],[[0,.088],[.35,.083],[.75,.068],[1,.058]],pants,root);limb([s*.12,-.04,.43],[s*.125,-.5,.6],[[0,.058],[.25,.06],[.75,.047],[1,.042]],pants,root);
  rbox(.105,.085,.27,.04,shoe,root,s*.125,-.585,.72,-.06);rbox(.11,.028,.285,.012,sole,root,s*.125,-.635,.72,-.06);rbox(.09,.02,.08,.008,string,root,s*.125,-.54,.66,-.4);}
 const spine=new THREE.Group();spine.position.set(0,.06,-.02);root.add(spine);
 const torso=mesh(new THREE.LatheGeometry([[0,0],[.15,0],[.155,.08],[.16,.2],[.172,.32],[.178,.4],[.15,.47],[.09,.5],[0,.51]].map(([r,y])=>new THREE.Vector2(r,y)),24),hoodie,spine,0,0,0);torso.scale.set(1.18,1,.78);torso.rotation.x=-.05;
 rbox(.24,.1,.04,.02,hoodie,spine,0,.14,.12,-.05);const hood=mesh(new THREE.SphereGeometry(.13,20,12,0,Math.PI*2,0,Math.PI*.55),hoodie,spine,0,.46,-.1,-1.9,0,0);hood.scale.set(1.15,.75,1);
 for(const s of [-1,1])limb([s*.05,.44,.155],[s*.06,.26,.165],[[0,.008],[1,.008]],string,spine);
 const neck=new THREE.Group();neck.position.set(0,.5,-.01);spine.add(neck);limb([0,0,0],[0,.09,.01],[[0,.052],[1,.048]],skin,neck);
 const head=new THREE.Group();head.position.set(0,.18,.005);neck.add(head);
 const skull=mesh(new THREE.SphereGeometry(.105,40,28),faceMat,head,0,0,0);skull.scale.set(.86,1.08,1);
 mesh(new THREE.SphereGeometry(.024,12,10),skin,head,0,-.015,.1).scale.set(.8,1.1,1.1);for(const s of [-1,1])mesh(new THREE.SphereGeometry(.026,12,10),skin,head,s*.09,0,-.005).scale.set(.45,1,.75);
 // Wraparound sunglasses: a flattened arc across the front of the face.
 const glasses=mesh(new THREE.TorusGeometry(.108,.016,8,32,Math.PI*.8),lens,head,0,.012,.006,Math.PI/2,0,Math.PI*.1);glasses.scale.set(1,1,1.45);
 const cap=mesh(new THREE.SphereGeometry(.113,32,16,0,Math.PI*2,0,Math.PI*.56),beanie,head,0,.02,-.008);cap.scale.set(.9,1.06,1.05);cap.rotation.x=-.18;const cuff=mesh(new THREE.TorusGeometry(.1,.018,10,32),beanie,head,0,.035,-.02,Math.PI/2-.18,0,0);cuff.scale.set(.92,1.07,1);
 for(const s of [-1,1]){const sh=[s*.2,.42,-.05],el=[s*.27,.14,0],wr=[s*.3,s>0?.15:.075,.29];limb(sh,el,[[0,.062],[.5,.056],[1,.05]],hoodie,spine);limb(el,wr,[[0,.05],[.6,.045],[.9,.042],[1,.036]],hoodie,spine);limb([s*.3,wr[1],.28],[s*.3,wr[1]+.008,.31],[[0,.032],[1,.03]],skin,spine);
  const hand=new THREE.Group();hand.position.set(s*.305,s>0?.165:.075,.35);spine.add(hand);rbox(.075,.028,.085,.012,skin,hand,0,0,0);for(let f=0;f<4;f++){const fx=-.026+f*.017;limb([fx,0,.04],[fx,-.022,.075],[[0,.009],[1,.008]],skin,hand);}limb([-s*.038,0,0],[-s*.045,-.01,.04],[[0,.011],[1,.009]],skin,hand);}
 // Nitro thrusters stay hidden until boost.
 const jets=[],jx=chairModel?.12:.24,jy=chairModel?.26:.44,jz=chairModel?-.55:-.7;for(const x of [-jx,jx]){if(!chairModel)mesh(new THREE.CylinderGeometry(.07,.08,.18,16),M.alu,rig,x,jy,jz,Math.PI/2);const jet=new THREE.Mesh(new THREE.ConeGeometry(.12,1.1,16,1,true),new THREE.MeshBasicMaterial({color:'#5cc8ff',transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));jet.add(new THREE.Mesh(new THREE.ConeGeometry(.055,.6,12),new THREE.MeshBasicMaterial({color:'#f2fbff',transparent:true,opacity:.95,depthWrite:false,blending:THREE.AdditiveBlending})));jet.children[0].position.y=.25;jet.rotation.x=-Math.PI/2;if(chairModel)jet.scale.setScalar(.6);jet.position.set(x,jy,chairModel?-.92:-1.35);jet.visible=false;rig.add(jet);jets.push(jet);}
 const groups=[];rig.traverse(o=>{if(o.isGroup||o===rig)groups.push(o);});for(const g of groups)mergeChildren(g);
 // Scanned Rocketbox rider (seated rest pose): replaces the capsule figure; the procedural joints
 // stay as invisible proxies whose rotations are transferred onto the real spine, neck and head bones.
 let applyJoints=()=>{};if(riderModel){root.visible=false;const body=riderModel.scene;rider.add(body);body.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});
  const bone=k=>{let b=null;body.traverse(o=>{if(!b&&o.isBone&&o.name.replace(/_/g,' ').endsWith(k))b=o;});return b;};
  rig.updateMatrixWorld(true);const pelvis=bone('Pelvis');if(pelvis){const at=rig.worldToLocal(pelvis.getWorldPosition(new THREE.Vector3()));body.position.add(new THREE.Vector3(...CHAIR.seat).sub(at));}
  const links=[[bone('Spine1'),spine],[bone('Neck'),neck],[bone('Head'),head]].filter(([b])=>b).map(([b,proxy])=>({b,proxy,rest:b.quaternion.clone()}));
  const qr=new THREE.Quaternion(),qp=new THREE.Quaternion(),qd=new THREE.Quaternion(),e=new THREE.Euler();
  applyJoints=()=>{rig.getWorldQuaternion(qr);for(const l of links){l.b.quaternion.copy(l.rest);l.b.parent.getWorldQuaternion(qp);qd.setFromEuler(e.set(l.proxy.rotation.x,l.proxy.rotation.y,l.proxy.rotation.z));
   // Rider-space delta -> world -> bone-parent space, applied on top of the rest pose.
   qd.premultiply(qr).multiply(qr.clone().invert());qd.premultiply(qp.clone().invert()).multiply(qp);l.b.quaternion.premultiply(qd);l.b.updateMatrixWorld(true);}};}
 return {player,rig,wheels,casters,jets,rider,joints:{root,spine,neck,head},applyJoints,riderMaterials:{skin,cloth:hoodie,pants,beanie,lens}};}
