import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {groundHeight} from './street.js';
// Loose street objects you can knock about: Vélib' bikes, e-scooters, café tables and chairs, green
// wheelie bins and roadworks cones. Each has a mass; the chair shoves it with its momentum (and loses
// a little speed), it slides with friction, spins, and tall things tip over and lie where they fall.
// They bump into each other and into walls, kerb furniture and buildings.
const CHAIR_MASS=150;
function template(build){const g=new THREE.Group(),B=new Builder();build(B);B.build(g).forEach(m=>{m.castShadow=m.receiveShadow=true;});return g;}
function makeTemplates(){
 const mat=(c,r=.5,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
 const M={velib:mat('#8d9b94',.45,.3),tyre:mat('#18191a',.85),steel:mat('#2b2f31',.45,.7),binBody:mat('#2c5a3c',.55),binLid:mat('#2c5a3c',.5),lidY:mat('#e2b51f',.5),cone:mat('#e8561c',.6),white:mat('#f2f0ea',.4),
  rattan:mat('#8a6440',.8),weave:mat('#c9b38a',.7),top:mat('#2b2b2b',.3,.6),scootDeck:mat('#2fbf6a',.4),scoot:mat('#1d1f20',.4,.4)};
 const tube=(B,a,b,r,m)=>{const A=new THREE.Vector3(...a),E=new THREE.Vector3(...b),d=E.clone().sub(A);const e=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.clone().normalize()));B.add(new THREE.CylinderGeometry(r,r,d.length(),6),m,(A.x+E.x)/2,(A.y+E.y)/2,(A.z+E.z)/2,e.x,e.y,e.z);};
 const T={};
 T.bike=template(B=>{const w=new THREE.TorusGeometry(.33,.03,8,24).rotateY(Math.PI/2);for(const z of [-.52,.52])B.add(w,M.tyre,0,.34,z);
  tube(B,[0,.34,-.52],[0,.95,-.42],.03,M.velib);tube(B,[0,.4,.1],[0,.92,-.42],.035,M.velib);tube(B,[0,.4,.1],[0,.34,.52],.025,M.velib);tube(B,[0,.4,.1],[0,.85,.2],.03,M.velib);
  B.box(.08,.05,.24,M.tyre,0,.88,.2);B.box(.5,.03,.03,M.steel,0,1,-.44);B.box(.32,.2,.3,M.velib,0,.95,-.65);});
 T.scooter=template(B=>{B.box(.16,.05,.75,M.scootDeck,0,.1,0);tube(B,[0,.12,.36],[0,1.12,.42],.02,M.scoot);B.box(.45,.025,.025,M.scoot,0,1.12,.42);for(const z of [-.35,.38])B.add(new THREE.TorusGeometry(.1,.03,6,14).rotateY(Math.PI/2),M.tyre,0,.1,z);});
 T.bin=template(B=>{B.add(new THREE.CylinderGeometry(.33,.27,.92,4,1).rotateY(Math.PI/4).scale(1.05,1,1.3),M.binBody,0,.55,0);B.box(.62,.06,.8,M.lidY,0,1.03,0);B.box(.6,.05,.06,M.steel,0,.98,-.4);
  for(const s of [-1,1])B.add(new THREE.CylinderGeometry(.09,.09,.06,14).rotateZ(Math.PI/2),M.tyre,s*.27,.09,-.33);});
 T.binG=T.bin.clone(true);T.binG.traverse(o=>{if(o.isMesh&&o.material===M.lidY)o.material=M.binLid;});
 T.cone=template(B=>{B.add(new THREE.ConeGeometry(.16,.62,16),M.cone,0,.36,0);B.add(new THREE.CylinderGeometry(.095,.12,.09,16,1,true),M.white,0,.36,0);B.box(.36,.05,.36,M.cone,0,.025,0);});
 T.chair=template(B=>{B.box(.42,.04,.42,M.weave,0,.46,0);for(const [x,z] of [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]])B.cyl(.015,.015,.46,M.rattan,x,.23,z,6);B.box(.42,.42,.03,M.weave,0,.69,-.2);for(const x of [-.2,.2])B.cyl(.018,.018,.48,M.rattan,x,.7,-.21,6);});
 T.table=template(B=>{B.cyl(.32,.32,.03,M.top,0,.74,0,20);B.cyl(.03,.03,.72,M.steel,0,.37,0,8);B.cyl(.22,.22,.03,M.steel,0,.015,0,14);});
 return T;}
const KINDS={bike:{m:22,r:.55,w:.25,tall:true,tip:1},scooter:{m:13,r:.42,w:.2,tall:true,tip:.6},bin:{m:16,r:.42,w:.4,tall:true,tip:1.4},binG:{m:16,r:.42,w:.4,tall:true,tip:1.4},
 cone:{m:3,r:.2,w:.18,tall:true,tip:.4},chair:{m:4,r:.28,w:.22,tall:true,tip:.6},table:{m:11,r:.36,w:.35,tall:true,tip:1.6}};

export function buildDynamicProps(scene,obstacles){const T=makeTemplates(),props=[];
 const add=(kind,x,z,yaw=0,lying=false)=>{const k=KINDS[kind],obj=T[kind].clone(true);obj.traverse(o=>{o.userData.static=true;});scene.add(obj);
  const p={kind,obj,x,z,yaw,vx:0,vz:0,wy:0,tilt:lying?Math.PI/2:0,tv:0,nx:Math.sin(yaw+1.57),nz:Math.cos(yaw+1.57),...k};props.push(p);place(p);return p;};
 // Vélib' bikes in their docks, e-scooters, café furniture, wheelie bins, roadworks cones.
 for(let i=0;i<10;i++){if(i%4===3)continue;add('bike',-11+i*1.1,58.5,0);}
 for(const [x,z,y,l] of [[-14,54,.4,false],[6,52.5,2.2,true],[22,46,-.8,false],[-4,30,1.4,true],[58,-20,.3,false],[-58,35,2,true]])add('scooter',x,z,y,l);
 for(const [tx,tz] of [[-34,47],[-30,46.5],[-26,47.5],[-33,43],[-27.5,43.2]]){add('table',tx,tz);for(const a of [0,Math.PI])add('chair',tx+Math.sin(a)*.62,tz+Math.cos(a)*.62,a+Math.PI);}
 for(const s of [-1,1])for(let x=-110;x<=110;x+=22){if(s<0&&Math.abs(x)<30)continue;add((x/22)%2?'bin':'binG',x+(Math.random()-.5)*2,s*84.55,s>0?Math.PI:0);add("binG",x+.75+(Math.random()-.5)*.5,s*84.55,s>0?Math.PI:0);}
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2;add('cone',-48+Math.cos(a)*1.6,26+Math.sin(a)*1.6,a);}
 const statics=obstacles.filter(o=>!o.soft&&!o.railId&&o.h>.3);
 function place(p){const ax=new THREE.Vector3(p.nz,0,-p.nx).normalize(),q=new THREE.Quaternion().setFromAxisAngle(ax,p.tilt),qy=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw);
  p.obj.quaternion.copy(q).multiply(qy);p.obj.position.set(p.x,groundHeight(p.x,p.z)+p.w*Math.sin(p.tilt),p.z);}
 let last=null;
 return (dt,player)=>{const events=[];if(!dt)return events;const pvx=last?(player.x-last.x)/dt:0,pvz=last?(player.z-last.z)/dt:0;last={x:player.x,z:player.z};
  for(const p of props){
   // The chair shoves whatever it runs into, along the contact normal.
   const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),reach=p.r+.45;
   if(d<reach&&Math.abs(player.y||0)<1){const nx=dx/(d||1),nz=dz/(d||1),vrel=pvx*nx+pvz*nz;
    if(vrel>.3){const dv=vrel*1.7*CHAIR_MASS/(CHAIR_MASS+p.m);p.vx+=nx*dv+(Math.random()-.5)*dv*.3;p.vz+=nz*dv+(Math.random()-.5)*dv*.3;p.wy+=(Math.random()-.5)*dv*3;
     if(p.tall&&dv>p.tip&&p.tilt<.2){p.nx=nx;p.nz=nz;p.tv=Math.max(p.tv,dv*1.3);}events.push({type:'shove',mass:p.m,dv,nx,nz,vrel,kind:p.kind});}
    p.x=player.x+nx*reach;p.z=player.z+nz*reach;}
   const moving=Math.hypot(p.vx,p.vz)>.02||Math.abs(p.wy)>.02||Math.abs(p.tv)>.01||(p.tilt>.01&&p.tilt<Math.PI/2-.01);if(!moving)continue;
   p.x+=p.vx*dt;p.z+=p.vz*dt;const lying=p.tilt>1.2,f=lying?5.5:2.6;p.vx*=Math.exp(-dt*f);p.vz*=Math.exp(-dt*f);p.yaw+=p.wy*dt;p.wy*=Math.exp(-dt*(lying?5:3));
   // Tipping: gravity keeps a tip going once it starts; a nudge that is too small rocks back upright.
   if(p.tv>0||p.tilt>0){p.tv+=(p.tilt>.35?9*Math.sin(p.tilt):-12*p.tilt)*dt;p.tv*=Math.exp(-dt*1.2);p.tilt+=p.tv*dt;
    if(p.tilt>=Math.PI/2){p.tilt=Math.PI/2;p.tv=-p.tv*.22;if(Math.abs(p.tv)<.3)p.tv=0;}if(p.tilt<=0){p.tilt=0;p.tv=0;}}
   // Bump into walls and street furniture.
   for(const o of statics){if(Math.abs(p.x-o.x)>o.w/2+3||Math.abs(p.z-o.z)>o.d/2+3)continue;const cx=Math.max(o.x-o.w/2,Math.min(o.x+o.w/2,p.x)),cz=Math.max(o.z-o.d/2,Math.min(o.z+o.d/2,p.z)),ex=p.x-cx,ez=p.z-cz,e=Math.hypot(ex,ez);
    if(e<p.r&&e>1e-5){const nx=ex/e,nz=ez/e;p.x=cx+nx*p.r;p.z=cz+nz*p.r;const vn=p.vx*nx+p.vz*nz;if(vn<0){p.vx-=1.4*vn*nx;p.vz-=1.4*vn*nz;}}}
   // And into each other.
   for(const o of props){if(o===p)continue;const ex=o.x-p.x,ez=o.z-p.z,e=Math.hypot(ex,ez),min=(o.r+p.r)*.8;if(e<min&&e>1e-5){const nx=ex/e,nz=ez/e,push=(min-e)/2;p.x-=nx*push;p.z-=nz*push;o.x+=nx*push;o.z+=nz*push;
    const vn=(p.vx-o.vx)*nx+(p.vz-o.vz)*nz;if(vn>0){const j=vn*p.m/(p.m+o.m);o.vx+=nx*j;o.vz+=nz*j;p.vx-=nx*j*o.m/p.m*.5;p.vz-=nz*j*o.m/p.m*.5;}}}
   place(p);}
  for(const p of props)if(Math.hypot(p.vx,p.vz)>.02||p.tv)place(p);
  return events;};}
