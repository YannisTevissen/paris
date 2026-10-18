import * as THREE from './vendor/three.module.js';
import {clone as cloneSkinned} from './vendor/jsm/utils/SkeletonUtils.js';
import {groundHeight} from './street.js';
// Ambient life, all instanced so the whole crowd costs a handful of draw calls:
// pigeons that peck and take off when the chair comes close, plane leaves drifting down from
// nearby trees, and pedestrians walking the outer pavements or stopping to look at the tower.
let seed=31337;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),E=new THREE.Euler(),V=new THREE.Vector3(),S=new THREE.Vector3(1,1,1);
// userData.static keeps batchStatic from flattening these into the city mesh.
function instanced(geo,mat,count){const m=new THREE.InstancedMesh(geo,mat,count);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;m.userData.static=true;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);return m;}
// Geometry hanging down from a joint at the origin, length L, tapered radii.
function hang(L,r0,r1,seg=10){const g=new THREE.CylinderGeometry(r1,r0,L,seg,1);g.translate(0,-L/2,0);return g;}

function pigeons(scene){const N=34,body=new THREE.SphereGeometry(.11,12,8);body.scale(1,.85,1.6);const headG=new THREE.SphereGeometry(.055,10,8),wingG=new THREE.BufferGeometry();
 wingG.setAttribute('position',new THREE.Float32BufferAttribute([0,0,.1,.32,0,.02,.26,0,-.14,0,0,-.12, 0,0,.1,.26,0,-.14],3));wingG.setIndex([0,1,2,0,2,3]);wingG.computeVertexNormals();
 const grey=new THREE.MeshStandardMaterial({color:'#7f8690',roughness:.85}),dark=new THREE.MeshStandardMaterial({color:'#4c5560',roughness:.6,metalness:.2}),wingM=new THREE.MeshStandardMaterial({color:'#717983',roughness:.85,side:THREE.DoubleSide});
 const B=instanced(body,grey,N),H=instanced(headG,dark,N),WL=instanced(wingG,wingM,N),WR=instanced(wingG,wingM,N);scene.add(B,H,WL,WR);
 const flocks=[[-40,10],[40,-6],[-8,46],[10,-62],[-6,-95],[64,30]];const birds=Array.from({length:N},(_,i)=>{const f=flocks[i%flocks.length];return {x:f[0]+(rand()-.5)*6,y:0,z:f[1]+(rand()-.5)*6,h:rand()*7,vx:0,vy:0,vz:0,state:'ground',t:rand()*5,peck:rand()*6,home:f};});
 return (dt,player,speed,now)=>{for(let i=0;i<N;i++){const b=birds[i];const dx=b.x-player.x,dz=b.z-player.z,d=Math.hypot(dx,dz);
  if(b.state==='ground'){b.t-=dt;if(d<6.5&&speed>.8){b.state='fly';b.vx=dx/(d||1)*4+(rand()-.5)*2;b.vz=dz/(d||1)*4+(rand()-.5)*2;b.vy=4+rand()*2;b.t=2.5+rand()*2;}
   else if(b.t<0){b.h+=(rand()-.5)*2;b.t=.6+rand()*2.5;}else{const step=b.t%1.2<.6?.35*dt:0;b.x+=Math.sin(b.h)*step;b.z+=Math.cos(b.h)*step;}}
  else if(b.state==='fly'){b.t-=dt;b.vy-=(b.y>9?3:0)*dt;b.x+=b.vx*dt;b.y=Math.max(0,b.y+b.vy*dt);b.z+=b.vz*dt;b.h=Math.atan2(b.vx,b.vz);if(b.t<0){b.state='glide';const f=flocks[Math.floor(rand()*flocks.length)];b.home=f;b.tx=f[0]+(rand()-.5)*6;b.tz=f[1]+(rand()-.5)*6;}}
  else{const tx=b.tx-b.x,tz=b.tz-b.z,td=Math.hypot(tx,tz);const sp=Math.min(6,td*1.2+1.5);b.vx+=(tx/td*sp-b.vx)*dt*2;b.vz+=(tz/td*sp-b.vz)*dt*2;b.vy=(Math.min(6,td*.4)-b.y)*1.2;b.x+=b.vx*dt;b.z+=b.vz*dt;b.y=Math.max(0,b.y+b.vy*dt);b.h=Math.atan2(b.vx,b.vz);if(td<.4&&b.y<.05){b.state='ground';b.y=0;b.t=1;}}
  const flying=b.state!=='ground',flap=flying?Math.sin(now*(b.state==='fly'?24:10)+i)*.9:.05,peck=!flying&&(b.peck+now)%2.4<.25?.06:0;
  Q.setFromEuler(E.set(flying?-.2:0,b.h,0));V.set(b.x,b.y+.12+groundHeight(b.x,b.z),b.z);M4.compose(V,Q,S);B.setMatrixAt(i,M4);
  const hp=new THREE.Vector3(0,.09-peck,.15+peck*.5).applyQuaternion(Q).add(V);M4.compose(hp,Q,S);H.setMatrixAt(i,M4);
  // Folded wings lie along the flanks; in flight they open and beat.
  for(const [W,s] of [[WL,1],[WR,-1]]){const q=Q.clone().multiply(new THREE.Quaternion().setFromEuler(E.set(0,flying?0:s*.35,s*(flying?flap:-.45))));M4.compose(new THREE.Vector3(s*(flying?.06:.07),flying?.04:.05,flying?0:-.04).applyQuaternion(Q).add(V),q,new THREE.Vector3(s*(flying?1:.42),1,flying?1:1.1));W.setMatrixAt(i,M4);}}
  for(const m of [B,H,WL,WR])m.instanceMatrix.needsUpdate=true;};}

function leaves(scene,trees){const N=170,c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='#fff';g.beginPath();for(let k=0;k<10;k++){const a=k/10*Math.PI*2-Math.PI/2,r=k%2?13:30;g.lineTo(32+Math.cos(a)*r,34+Math.sin(a)*r);}g.fill();
 const tex=new THREE.CanvasTexture(c);const mat=new THREE.MeshStandardMaterial({alphaMap:tex,alphaTest:.5,side:THREE.DoubleSide,roughness:.8});mat.userData.ground=false;
 const mesh=instanced(new THREE.PlaneGeometry(.16,.16),mat,N);mesh.castShadow=false;scene.add(mesh);const palette=['#c98a2f','#a8662a','#d6a743','#8a5a2b','#b5823a','#9a8a3a'].map(h=>new THREE.Color(h));
 const leaf=Array.from({length:N},(_,i)=>({x:0,y:-1,z:0,vy:0,phase:rand()*7,spin:rand()*3,rest:rand()*8,rx:0,rz:0}));leaf.forEach((l,i)=>mesh.setColorAt(i,palette[i%palette.length]));
 const spawn=(l,player)=>{let best=null;for(let k=0;k<6;k++){const t=trees[Math.floor(rand()*trees.length)];if(!best||Math.hypot(t.x-player.x,t.z-player.z)<Math.hypot(best.x-player.x,best.z-player.z))best=t;}l.x=best.x+(rand()-.5)*5;l.z=best.z+(rand()-.5)*5;l.y=5.5+rand()*4.5;l.vy=.7+rand()*.6;l.rest=4+rand()*8;};
 return (dt,player,now)=>{for(let i=0;i<N;i++){const l=leaf[i];if(l.y>0){l.y-=l.vy*dt;l.x+=Math.sin(now*1.3+l.phase)*.55*dt+.15*dt;l.z+=Math.cos(now*.9+l.phase)*.35*dt;l.rx=Math.sin(now*2.2+l.phase)*1.2;l.rz=now*l.spin;if(l.y<=0){l.y=0;l.rx=-Math.PI/2;}}else{l.rest-=dt;if(l.rest<0)spawn(l,player);}
  M4.compose(V.set(l.x,l.y+.01,l.z),Q.setFromEuler(E.set(l.y>0?l.rx:-Math.PI/2,l.phase,l.y>0?l.rz:0)),S);mesh.setMatrixAt(i,M4);}mesh.instanceMatrix.needsUpdate=true;};}

function people(scene,obstacles){
 const routes=[];for(const z of [81.15,84.35])routes.push({z,x0:-122,x1:122});for(const z of [-81.2,-84.4]){routes.push({z,x0:-122,x1:-31});routes.push({z,x0:31,x1:122});}routes.push({z:-96,x0:-24,x1:24},{z:-89,x0:-24,x1:24});
 const N=22,coats=['#2b2f3a','#5a4636','#1f2b26','#8a7a62','#3a3f47','#6b2a2a','#c9c2b0','#23304a','#4a4a4a'],trousers=['#1d2026','#2f3a4c','#3d3a35','#55524a','#1a1a1a'],skins=['#e0b49a','#c99677','#a8714f','#7a4b32','#f0c8b0'],hairs=['#2a2420','#5a3d26','#b08c5a','#1a1a1a','#8a8a8a'];
 const coatM=new THREE.MeshStandardMaterial({roughness:.85}),legM=new THREE.MeshStandardMaterial({roughness:.8}),skinM=new THREE.MeshStandardMaterial({roughness:.6}),hairM=new THREE.MeshStandardMaterial({roughness:.9}),shoeM=new THREE.MeshStandardMaterial({color:'#151515',roughness:.5});
 const torsoG=new THREE.LatheGeometry([[0,0],[.15,0],[.165,.12],[.175,.3],[.18,.42],[.14,.5],[0,.52]].map(([r,y])=>new THREE.Vector2(r,y)),16);torsoG.scale(1.12,1,.72);
 const tailG=new THREE.CylinderGeometry(.17,.21,.4,16,1,true);tailG.translate(0,-.2,0);tailG.scale(1.1,1,.78);
 const parts={torso:instanced(torsoG,coatM,N),tail:instanced(tailG,coatM,N),head:instanced(new THREE.SphereGeometry(.105,16,12),skinM,N),hair:instanced(new THREE.SphereGeometry(.112,16,10,0,Math.PI*2,0,Math.PI*.55),hairM,N),
  thigh:instanced(hang(.45,.082,.06),legM,N*2),shin:instanced(hang(.44,.058,.044),legM,N*2),shoe:instanced(new THREE.SphereGeometry(.07,12,8).scale(.75,.5,1.85),shoeM,N*2),hips:instanced(new THREE.SphereGeometry(.17,16,10).scale(1.05,.6,.75),legM,N),neck:instanced(hang(.1,.05,.048),skinM,N),shoulder:instanced(new THREE.SphereGeometry(.068,12,8),coatM,N*2),arm:instanced(hang(.3,.055,.048),coatM,N*2),fore:instanced(hang(.27,.045,.04),coatM,N*2),hand:instanced(new THREE.SphereGeometry(.042,8,6),skinM,N*2)};
 tailG.computeBoundingSphere();Object.values(parts).forEach(m=>scene.add(m));
 const crowd=Array.from({length:N},(_,i)=>{const r=routes[i%routes.length];const p={r,x:r.x0+rand()*(r.x1-r.x0),z:r.z+(rand()-.5)*.6,dir:rand()<.5?-1:1,speed:1.1+rand()*.5,phase:rand()*7,still:r.z<-85&&rand()<.6,height:.92+rand()*.14,longCoat:rand()<.45};
  const ob={x:p.x,z:p.z,w:.5,d:.5,h:1.8,label:'Pedestrian'};obstacles.push(ob);p.ob=ob;const coat=new THREE.Color(coats[i%coats.length]);parts.torso.setColorAt(i,coat);parts.tail.setColorAt(i,coat);parts.head.setColorAt(i,new THREE.Color(skins[i%skins.length]));parts.hair.setColorAt(i,new THREE.Color(hairs[i%hairs.length]));
  parts.hips.setColorAt(i,new THREE.Color(trousers[i%trousers.length]));parts.neck.setColorAt(i,new THREE.Color(skins[i%skins.length]));for(const k of [0,1]){parts.shoulder.setColorAt(i*2+k,coat);parts.thigh.setColorAt(i*2+k,new THREE.Color(trousers[i%trousers.length]));parts.shin.setColorAt(i*2+k,new THREE.Color(trousers[i%trousers.length]));parts.arm.setColorAt(i*2+k,coat);parts.fore.setColorAt(i*2+k,coat);parts.hand.setColorAt(i*2+k,new THREE.Color(skins[i%skins.length]));}return p;});
 const base=new THREE.Matrix4(),joint=new THREE.Matrix4(),tmp=new THREE.Matrix4(),put=(mesh,i,m)=>mesh.setMatrixAt(i,m);
 const at=(parent,x,y,z,rx=0,ry=0)=>tmp.copy(parent).multiply(new THREE.Matrix4().compose(V.set(x,y,z),Q.setFromEuler(E.set(rx,ry,0)),S)).clone();
 return (dt,player,speed)=>{for(let i=0;i<N;i++){const p=crowd[i];const near=Math.hypot(p.x-player.x,p.z-player.z)<2.2;let v=p.still||near?0:p.speed;
  if(v>0){p.x+=p.dir*v*dt;if(p.x>p.r.x1){p.x=p.r.x1;p.dir=-1;}if(p.x<p.r.x0){p.x=p.r.x0;p.dir=1;}p.phase+=v*dt/.36;}p.ob.x=p.x;p.ob.z=p.z;
  const heading=p.still?Math.PI:(p.dir>0?Math.PI/2:-Math.PI/2),sw=v>0?Math.sin(p.phase):0,bob=v>0?Math.abs(Math.cos(p.phase))*.03:0,h=p.height;
  base.compose(V.set(p.x,0,p.z),Q.setFromEuler(E.set(0,heading,0)),new THREE.Vector3(h,h,h));
  const pelvis=at(base,0,.95+bob,0);put(parts.torso,i,pelvis);put(parts.hips,i,at(pelvis,0,.02,0));put(parts.neck,i,at(pelvis,0,.6,0));put(parts.tail,i,p.longCoat?pelvis:at(pelvis,0,0,0).scale(V.set(0,0,0)));
  const neck=at(pelvis,0,.52,0);put(parts.head,i,at(neck,0,.13,.01));put(parts.hair,i,at(neck,0,.145,-.005));
  for(const k of [0,1]){const s=k?1:-1,legSwing=s*sw*.42,knee=v>0?Math.max(0,Math.sin(p.phase+(k?0:Math.PI)+.6))*.55:0;
   const hip=at(pelvis,s*.09,0,0,legSwing),kneeM=at(hip,0,-.45,0,-knee);put(parts.thigh,i*2+k,hip);put(parts.shin,i*2+k,kneeM);put(parts.shoe,i*2+k,at(kneeM,0,-.47,.06,knee*.5-legSwing));
   const sh=at(pelvis,s*.195,.46,0,-s*sw*.35,0);put(parts.shoulder,i*2+k,sh);const el=at(sh,0,-.3,0,-.18);put(parts.arm,i*2+k,sh);put(parts.fore,i*2+k,el);put(parts.hand,i*2+k,at(el,0,-.29,0));}}
  for(const m of Object.values(parts))m.instanceMatrix.needsUpdate=true;};}

// Scanned Rocketbox people (MIT) with their own mixers. Walkers follow the pavements and promenades,
// sometimes stop to look around or check their phone, turn round at the end of a route, step aside
// for each other and glance at the chair as it passes. Groups chat by the fountain and people sit on
// the benches. Everyone is a soft obstacle: the chair knocks them over and they get back up.
const BENCHES=[];for(const s of [-1,1])for(let z=-45;z<=45;z+=18)BENCHES.push({x:s*62.6,z,yaw:s>0?-Math.PI/2:Math.PI/2});
const GROUPS=[{x:-27.5,z:13,n:3,clip:'talk'},{x:-43,z:-6,n:2,clip:'talk'},{x:-25.5,z:-5,n:1,clip:'phone'},{x:30,z:-30,n:2,clip:'talk'},{x:-8,z:40,n:1,clip:'phone'},{x:12,z:-52,n:3,clip:'talk'},
 {x:8,z:31,n:2,clip:'talk'},{x:-15,z:-27,n:2,clip:'phone'},{x:40,z:-12,n:3,clip:'talk'},{x:20,z:56,n:2,clip:'talk'},{x:-54,z:22,n:1,clip:'look'},{x:47,z:12,n:2,clip:'talk'},{x:-8,z:-14,n:1,clip:'look'}];
function crowd(scene,obstacles,models,clips){const routes=[];
 for(const z of [81.3,83.75])routes.push({axis:'x',c:z,a0:-122,a1:122});for(const z of [-81.3,-83.8]){routes.push({axis:'x',c:z,a0:-122,a1:-31},{axis:'x',c:z,a0:31,a1:122});}
 routes.push({axis:'x',c:-96,a0:-24,a1:24},{axis:'x',c:-89,a0:-24,a1:24});for(const x of [-71.2,71.2,-62.5,62.5])routes.push({axis:'z',c:x,a0:-60,a1:60});
 routes.push({axis:'z',c:-44,a0:-56,a1:56},{axis:'z',c:44,a0:-56,a1:30},{axis:'x',c:48,a0:-40,a1:40},{axis:'x',c:-52,a0:-40,a1:40});
 // Through the middle of the square, threading between the fountain, carousel and skate obstacles.
 routes.push({axis:'z',c:-22,a0:-15,a1:55},{axis:'z',c:22,a0:-12,a1:45},{axis:'x',c:-60,a0:-40,a1:40},{axis:'x',c:28.5,a0:-12,a1:12});
 const Y=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),qy=new THREE.Quaternion(),axis=new THREE.Vector3(),qw=new THREE.Quaternion(),qp=new THREE.Quaternion(),tmp=new THREE.Vector3();
 let mi=0;const people=[];
 const spawn=(kind,opts)=>{const g=models[mi++%models.length],sex=g.userData.sex||'m',C=clips[sex]||{};const body=cloneSkinned(g.scene);body.traverse(o=>{o.userData.static=true;if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});scene.add(body);
  const k=.94+rand()*.12;body.scale.setScalar(k);const mixer=new THREE.AnimationMixer(body),acts={};
  if(g.animations[0]){acts.walk=mixer.clipAction(g.animations[0]);}for(const [n,c] of Object.entries(C))acts[n]=mixer.clipAction(c);
  let head=null;body.traverse(o=>{if(!head&&o.isBone&&/Head$/.test(o.name))head=o;});
  const p={kind,body,mixer,acts,head,cur:null,yaw:0,x:0,z:0,v:0,state:'walk',t:0,tilt:0,spin:0,fx:0,fz:0,slide:0,look:0,pace:(g.userData.pace||1.2)*k,...opts};
  p.ob={x:p.x,z:p.z,w:.5,d:.5,h:1.8,label:'Pedestrian',soft:true};obstacles.push(p.ob);people.push(p);return p;};
 const play=(p,name,fade=.5)=>{const a=p.acts[name]||p.acts.walk;if(!a||p.cur===a)return;a.reset();a.time=rand()*a.getClip().duration;a.play();if(p.cur)p.cur.crossFadeTo(a,fade,false);p.cur=a;};
 for(let i=0;i<52;i++){const r=routes[i%routes.length],u=r.a0+rand()*(r.a1-r.a0),off=(rand()-.5)*.3,dir=rand()<.5?-1:1;
  const p=spawn('walker',{r,u,off,dir,speed:(r.c<-85?.8:1.15)+rand()*.3,nextPause:6+rand()*30});p.x=r.axis==='x'?u:r.c+off;p.z=r.axis==='x'?r.c+off:u;p.yaw=r.axis==='x'?(dir>0?Math.PI/2:-Math.PI/2):(dir>0?0:Math.PI);play(p,'walk',0);}
 for(const G of GROUPS)for(let i=0;i<G.n;i++){const a=i/G.n*Math.PI*2+rand()*.4,rad=G.n>1?.75:0;const p=spawn('stand',{state:'idle',idle:G.clip});p.x=G.x+Math.cos(a)*rad;p.z=G.z+Math.sin(a)*rad;p.yaw=G.n>1?Math.atan2(G.x-p.x,G.z-p.z):rand()*6.28;play(p,G.clip,0);}
 for(const [i,b] of BENCHES.entries()){if(i%3===1)continue;const p=spawn('sit',{state:'idle',idle:'sit'});p.yaw=b.yaw;p.x=b.x+Math.sin(b.yaw)*-.12+(i%2?.4:-.4)*Math.cos(b.yaw);p.z=b.z+Math.cos(b.yaw)*-.12;play(p,'sit',0);}
 let last=null;
 return (dt,player,speed)=>{const events=[];const pvx=last&&dt>0?(player.x-last.x)/dt:0,pvz=last&&dt>0?(player.z-last.z)/dt:0;last={x:player.x,z:player.z};
  for(const p of people){const d=Math.hypot(p.x-player.x,p.z-player.z);
   if(p.state==='walk'||p.state==='pause'||p.state==='idle'||p.state==='turn'){
    const closing=Math.hypot(pvx,pvz);if(d<.8&&closing>1.4&&Math.abs(player.y||0)<1.2){let fx=pvx/closing,fz=pvz/closing;if(closing<3){fx=(p.x-player.x)/(d||1);fz=(p.z-player.z)/(d||1);}
     p.resume=p.state==='idle'?'idle':'walk';p.state='fall';p.t=0;p.tilt=0;p.spin=0;p.fx=fx;p.fz=fz;p.slide=Math.min(closing*.55,6);p.ob.x=1e4;if(p.cur)p.cur.paused=true;events.push({type:'knock',speed:closing});continue;}}
   if(p.state==='walk'){const near=d<2.2;
    // Step aside for someone coming the other way on the same line.
    let side=0;for(const o of people)if(o!==p&&o.state==='walk'&&o.r===p.r&&o.dir!==p.dir&&Math.abs(o.u-p.u)<3)side=p.dir*.45;
    p.v+=((near?0:p.speed)-p.v)*(1-Math.exp(-dt*4));p.u+=p.dir*p.v*dt;p.nextPause-=dt;
    if(p.u>p.r.a1||p.u<p.r.a0){p.u=Math.max(p.r.a0,Math.min(p.r.a1,p.u));p.dir*=-1;p.state='turn';p.t=0;}
    else if(p.nextPause<0&&!near){p.state='pause';p.t=4+rand()*6;play(p,rand()<.5?'look':'phone');}
    const off=p.off+side,tx=p.r.axis==='x'?p.u:p.r.c+off,tz=p.r.axis==='x'?p.r.c+off:p.u;p.x+=(tx-p.x)*(1-Math.exp(-dt*3));p.z+=(tz-p.z)*(1-Math.exp(-dt*3));
    const want=p.r.axis==='x'?(p.dir>0?Math.PI/2:-Math.PI/2):(p.dir>0?0:Math.PI);p.yaw+=Math.atan2(Math.sin(want-p.yaw),Math.cos(want-p.yaw))*(1-Math.exp(-dt*6));
    if(p.cur)p.cur.timeScale=p.v/p.pace;}
   else if(p.state==='turn'){p.v*=Math.exp(-dt*6);const want=p.r.axis==='x'?(p.dir>0?Math.PI/2:-Math.PI/2):(p.dir>0?0:Math.PI),dy=Math.atan2(Math.sin(want-p.yaw),Math.cos(want-p.yaw));p.yaw+=dy*(1-Math.exp(-dt*3.5));if(p.cur)p.cur.timeScale=.6;if(Math.abs(dy)<.05){p.state='walk';}}
   else if(p.state==='pause'){p.v=0;p.t-=dt;if(p.t<0){p.state='walk';p.nextPause=15+rand()*35;play(p,'walk');p.cur.timeScale=0;}}
   if(p.state==='walk'||p.state==='pause'||p.state==='idle'||p.state==='turn'){
    p.body.position.set(p.x,groundHeight(p.x,p.z),p.z);p.body.quaternion.setFromAxisAngle(Y,p.yaw);p.ob.x=p.x;p.ob.z=p.z;
    if(d<90){p.mixer.update(p.state==='idle'||p.state==='pause'?dt:dt);
     // Glance at the chair when it is close: head turns toward it within a natural range.
     const target=d<7?Math.max(-1,Math.min(1,Math.atan2(Math.sin(Math.atan2(player.x-p.x,player.z-p.z)-p.yaw),Math.cos(Math.atan2(player.x-p.x,player.z-p.z)-p.yaw)))):0;p.look+=(target-p.look)*(1-Math.exp(-dt*4));
     if(p.head&&Math.abs(p.look)>.01){qw.setFromAxisAngle(Y,p.look*.85);p.head.parent.getWorldQuaternion(qp);const qd=qp.clone().invert().multiply(qw).multiply(qp);p.head.quaternion.premultiply(qd);}}
    continue;}
   // Fall, lie, get up.
   p.t+=dt;if(p.state==='fall'){p.spin+=dt*(2.2+p.spin*5);p.tilt=Math.min(Math.PI/2*.97,p.tilt+p.spin*dt*2.4);p.slide*=Math.exp(-dt*(p.tilt>1.3?5:1.2));p.x+=p.fx*p.slide*dt;p.z+=p.fz*p.slide*dt;if(p.t>1.1){p.state='down';p.t=0;}}
   else if(p.state==='down'){if(p.t>3.2){p.state='rise';p.t=0;}}
   else if(p.state==='rise'){p.tilt=Math.max(0,p.tilt-dt*1.6);if(p.tilt<=0){p.state=p.resume||'walk';if(p.cur)p.cur.paused=false;if(p.r)p.u=p.r.axis==='x'?p.x:p.z;p.ob.x=p.x;p.ob.z=p.z;p.v=0;}}
   axis.set(p.fz,0,-p.fx).normalize();q.setFromAxisAngle(axis,p.tilt);qy.setFromAxisAngle(Y,p.yaw);
   p.body.quaternion.copy(q).multiply(qy);p.body.position.set(p.x,groundHeight(p.x,p.z)+.11*Math.sin(p.tilt),p.z);}
  return events;};}

export function createLife(scene,obstacles,trees,water,walkers=[],clips={}){const updPigeons=pigeons(scene),updLeaves=leaves(scene,trees),updPeople=walkers.length?crowd(scene,obstacles,walkers,clips):people(scene,obstacles);
 const update=(dt,player,speed)=>{const now=performance.now()*.001;updPigeons(dt,player,speed,now);updLeaves(dt,player,now);const events=updPeople(dt,player,speed)||[];if(water&&water.normalMap){water.normalMap.offset.x=now*.012;water.normalMap.offset.y=now*.007;}return events;};update.setWater=w=>{water=w;};return update;}
