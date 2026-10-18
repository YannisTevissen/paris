import * as THREE from './vendor/three.module.js';
import {clone as cloneSkinned} from './vendor/jsm/utils/SkeletonUtils.js';
import {groundHeight} from './street.js';
// Children playing football in the square, and dogs: an articulated quadruped with a trotting gait
// (diagonal leg pairs, body bob, wagging tail), used for a dog chasing the ball with the kids and for
// dogs walked on a leash by passers-by (see life.js). Kids and dogs dodge the chair.

// --- Dogs -----------------------------------------------------------------------------------------
const BREEDS=[{coat:'#b98a4f',belly:'#e3c79a',size:1,ears:'drop'},{coat:'#1d1b1a',belly:'#3a3633',size:.9,ears:'up'},{coat:'#f1ece2',belly:'#f6f2ea',size:.62,ears:'drop'},
 {coat:'#6b4a33',belly:'#d9c3a3',size:.8,ears:'drop'},{coat:'#8a8580',belly:'#cfcac2',size:1.1,ears:'up'},{coat:'#c9a46a',belly:'#f0e2c6',size:.55,ears:'up'}];
let furTex=null;
function fur(){if(furTex)return furTex;const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#808080';g.fillRect(0,0,128,128);
 for(let i=0;i<4000;i++){const v=100+Math.random()*80;g.strokeStyle=`rgb(${v},${v},${v})`;g.globalAlpha=.5;const x=Math.random()*128,y=Math.random()*128;g.beginPath();g.moveTo(x,y);g.lineTo(x+(Math.random()-.5)*2,y+3+Math.random()*3);g.stroke();}
 furTex=new THREE.CanvasTexture(c);furTex.wrapS=furTex.wrapT=THREE.RepeatWrapping;return furTex;}
export function makeDog(i){const b=BREEDS[i%BREEDS.length],k=b.size*(.95+Math.random()*.1);
 const coat=new THREE.MeshStandardMaterial({color:b.coat,roughness:.92,bumpMap:fur(),bumpScale:2}),belly=new THREE.MeshStandardMaterial({color:b.belly,roughness:.92,bumpMap:fur(),bumpScale:2}),dark=new THREE.MeshStandardMaterial({color:'#141212',roughness:.4});
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);const mk=(g,m,parent,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;parent.add(o);return o;};
 mk(new THREE.CapsuleGeometry(.13,.42,6,12).rotateX(Math.PI/2),coat,body,0,.46,0);mk(new THREE.SphereGeometry(.15,14,10),coat,body,0,.5,.22).scale.set(1,1.05,1.1);mk(new THREE.CapsuleGeometry(.1,.28,4,8).rotateX(Math.PI/2),belly,body,0,.4,0);
 const neck=new THREE.Group();neck.position.set(0,.58,.3);body.add(neck);mk(new THREE.CylinderGeometry(.07,.09,.2,10),coat,neck,0,.06,.04,.6);
 const head=new THREE.Group();head.position.set(0,.16,.1);neck.add(head);mk(new THREE.SphereGeometry(.1,14,10),coat,head,0,0,0).scale.set(.95,.9,1.05);mk(new THREE.BoxGeometry(.09,.08,.14),belly,head,0,-.03,.11);mk(new THREE.SphereGeometry(.025,8,6),dark,head,0,-.015,.185);
 for(const s of [-1,1]){mk(new THREE.SphereGeometry(.015,6,6),dark,head,s*.045,.03,.08);const ear=mk(b.ears==='up'?new THREE.ConeGeometry(.04,.1,6):new THREE.BoxGeometry(.05,.11,.02),coat,head,s*.065,b.ears==='up'?.1:.0,-.02,0,0,b.ears==='up'?s*-.2:s*.25);}
 const tail=new THREE.Group();tail.position.set(0,.53,-.3);body.add(tail);mk(new THREE.CylinderGeometry(.015,.03,.28,6),coat,tail,0,.1,-.08,-.9);
 const legs=[];for(const [x,z,ph] of [[.08,.22,0],[-.08,.22,Math.PI],[.08,-.22,Math.PI],[-.08,-.22,0]]){const hip=new THREE.Group();hip.position.set(x,.44,z);body.add(hip);mk(new THREE.CylinderGeometry(.035,.03,.22,8),coat,hip,0,-.11,0);
  const knee=new THREE.Group();knee.position.set(0,-.22,0);hip.add(knee);mk(new THREE.CylinderGeometry(.025,.02,.2,8),coat,knee,0,-.1,0);mk(new THREE.SphereGeometry(.03,8,6),coat,knee,0,-.2,.015);legs.push({hip,knee,ph,front:z>0});}
 root.scale.setScalar(k);root.traverse(o=>o.userData.static=true);
 let phase=Math.random()*6,wag=Math.random()*6;
 return {root,head,neck,k,update(dt,speed,mode='walk'){phase+=dt*(2+speed*4.2/k);wag+=dt*(mode==='play'?14:8);const amp=Math.min(.7,speed*.45);
  for(const l of legs){const s=Math.sin(phase+l.ph);l.hip.rotation.x=s*amp;l.knee.rotation.x=(l.front?-1:1)*Math.max(0,-Math.cos(phase+l.ph))*amp*.9;}
  body.position.y=Math.abs(Math.sin(phase))*.02*Math.min(1,speed)-(mode==='sit'?.12:0);body.rotation.x=mode==='sit'?-.35:0;if(mode==='sit')for(const l of legs)if(!l.front){l.hip.rotation.x=-1.2;l.knee.rotation.x=1.6;}
  tail.rotation.z=Math.sin(wag)*.5;neck.rotation.x=mode==='sniff'?.9:Math.sin(phase*2)*.05*Math.min(1,speed);}};}

// --- Kids playing football ---------------------------------------------------------------------
const AREA={x:26,z:36,r:6.5};
export function buildPlay(scene,kidModels){
 const kids=[],ball={x:AREA.x,z:AREA.z,vx:2,vz:1};
 const ballMesh=new THREE.Mesh(new THREE.SphereGeometry(.11,20,14),new THREE.MeshStandardMaterial({map:(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d');g.fillStyle='#f4f4f0';g.fillRect(0,0,128,64);g.fillStyle='#1c1c1c';for(let i=0;i<9;i++){g.beginPath();g.arc((i*37)%128,(i*23)%64,7,0,Math.PI*2);g.fill();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})(),roughness:.5}));
 ballMesh.castShadow=true;ballMesh.userData.static=true;scene.add(ballMesh);
 kidModels.forEach((g,gi)=>{for(let j=0;j<2;j++){const body=cloneSkinned(g.scene);body.traverse(o=>{o.userData.static=true;if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;}});scene.add(body);
  const mixer=new THREE.AnimationMixer(body),run=g.animations[0]?mixer.clipAction(g.animations[0]):null;if(run){run.play();run.time=Math.random();}
  const a=(gi*2+j)/4*Math.PI*2;kids.push({body,mixer,run,x:AREA.x+Math.cos(a)*3,z:AREA.z+Math.sin(a)*3,yaw:0,v:0,lazy:Math.random(),cool:0});}});
 const dog=makeDog(0);scene.add(dog.root);const dg={x:AREA.x+2,z:AREA.z,yaw:0,v:0};
 return (dt,player)=>{if(!dt)return;const pd=Math.hypot(ball.x-player.x,ball.z-player.z);
  // The chair can boot the ball too.
  if(pd<.7){const nx=(ball.x-player.x)/(pd||1),nz=(ball.z-player.z)/(pd||1);ball.vx+=nx*6;ball.vz+=nz*6;}
  ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;ball.vx*=Math.exp(-dt*.9);ball.vz*=Math.exp(-dt*.9);
  const bd=Math.hypot(ball.x-AREA.x,ball.z-AREA.z);if(bd>AREA.r+3){const nx=(ball.x-AREA.x)/bd,nz=(ball.z-AREA.z)/bd,vn=ball.vx*nx+ball.vz*nz;if(vn>0){ball.vx-=2*vn*nx;ball.vz-=2*vn*nz;}}
  const sp=Math.hypot(ball.vx,ball.vz);ballMesh.position.set(ball.x,groundHeight(ball.x,ball.z)+.11,ball.z);ballMesh.rotation.x+=ball.vz*dt/.11;ballMesh.rotation.z-=ball.vx*dt/.11;
  // Nearest kid chases the ball, the others drift into space; a kick sends it to a team-mate.
  let chaser=null,best=1e9;for(const k of kids){const d=Math.hypot(k.x-ball.x,k.z-ball.z)+k.lazy;if(d<best){best=d;chaser=k;}}
  for(const k of kids){let tx,tz;if(k===chaser){tx=ball.x;tz=ball.z;}else{const a=Math.atan2(k.z-AREA.z,k.x-AREA.x)+.3*dt;tx=AREA.x+Math.cos(a)*4;tz=AREA.z+Math.sin(a)*4;}
   const cd=Math.hypot(k.x-player.x,k.z-player.z);if(cd<3){tx=k.x+(k.x-player.x)/cd*3;tz=k.z+(k.z-player.z)/cd*3;}// dodge the chair
   const dx=tx-k.x,dz=tz-k.z,d=Math.hypot(dx,dz),want=d>.4?Math.min(k===chaser||cd<3?3.4:1.6,d*1.5):0;k.v+=(want-k.v)*(1-Math.exp(-dt*4));
   if(d>.05){const yaw=Math.atan2(dx,dz);k.yaw+=Math.atan2(Math.sin(yaw-k.yaw),Math.cos(yaw-k.yaw))*(1-Math.exp(-dt*8));}
   k.x+=Math.sin(k.yaw)*k.v*dt;k.z+=Math.cos(k.yaw)*k.v*dt;k.cool-=dt;
   if(k===chaser&&Math.hypot(k.x-ball.x,k.z-ball.z)<.45&&k.cool<0){const mate=kids[(kids.indexOf(k)+1+Math.floor(Math.random()*3))%kids.length];const ex=mate.x-ball.x,ez=mate.z-ball.z,e=Math.hypot(ex,ez)||1;const pow=3+Math.random()*3.5;ball.vx=ex/e*pow+(Math.random()-.5);ball.vz=ez/e*pow+(Math.random()-.5);k.cool=.8;}
   k.body.position.set(k.x,groundHeight(k.x,k.z)+Math.abs(Math.sin(performance.now()*.012+k.lazy*9))*.04*Math.min(1,k.v/2),k.z);k.body.rotation.y=k.yaw;if(k.run)k.run.timeScale=Math.max(.15,k.v/2.6);k.mixer.update(dt);}
  // The dog bounds after the ball too.
  {const dx=ball.x-dg.x,dz=ball.z-dg.z,d=Math.hypot(dx,dz);const cd=Math.hypot(dg.x-player.x,dg.z-player.z);let want=d>.8?Math.min(5,d*2):0,yaw=Math.atan2(dx,dz);if(cd<2.5){yaw=Math.atan2(dg.x-player.x,dg.z-player.z);want=5;}
   dg.v+=(want-dg.v)*(1-Math.exp(-dt*5));dg.yaw+=Math.atan2(Math.sin(yaw-dg.yaw),Math.cos(yaw-dg.yaw))*(1-Math.exp(-dt*7));dg.x+=Math.sin(dg.yaw)*dg.v*dt;dg.z+=Math.cos(dg.yaw)*dg.v*dt;
   dog.root.position.set(dg.x,groundHeight(dg.x,dg.z),dg.z);dog.root.rotation.y=dg.yaw;dog.update(dt,dg.v,dg.v<.3?'sit':'play');}};}
