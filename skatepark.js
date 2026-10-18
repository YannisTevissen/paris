import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {surface} from './materials.js';
// Concrete skate plaza at real park dimensions: kickers, a funbox, a bank-to-quarter with round
// coping, a grind ledge, a manual pad, a stair set and 45 cm flat bars. Each obstacle is a ridden
// profile along its axis, so one description drives the mesh, the ride height and the side collisions.
const DIRS={'+z':[0,1],'-z':[0,-1],'+x':[1,0],'-x':[-1,0]};

// Profile points {u,h,s}: distance along the axis, height, slope (Infinity on a riser).
function profile(segments){const pts=[{u:0,h:0,s:0}];let u=0,h=0,a=0;
 const push=(s)=>pts.push({u,h,s});
 for(const g of segments){
  if(g.curve){const target=g.deg*Math.PI/180,steps=Math.max(6,Math.ceil((target-a)/.04));pts.push({u,h,s:Math.tan(a)});
   for(let i=0;i<steps;i++){const a1=a+(target-a)/steps;u+=g.curve*(Math.sin(a1)-Math.sin(a));h+=g.curve*(Math.cos(a)-Math.cos(a1));a=a1;push(Math.tan(a));}}
  else if(g.bank){const s=g.rise/g.bank;pts.push({u,h,s});u+=g.bank;h+=g.rise;push(s);a=Math.atan(s);}
  else if(g.flat){pts.push({u,h,s:0});u+=g.flat;push(0);a=0;}
  else if(g.steps){for(let i=0;i<g.steps;i++){pts.push({u,h,s:Infinity});h+=g.rise;u+=.001;push(Infinity);pts.push({u,h,s:0});u+=g.tread;push(0);}a=0;}}
 return pts;}
const heightOn=(pts,u)=>{if(u<=0||u>=pts[pts.length-1].u)return u<=0?0:pts[pts.length-1].h;let i=1;while(pts[i].u<u)i++;const p=pts[i-1],q=pts[i];return q.u-p.u<1e-6?Math.max(p.h,q.h):p.h+(q.h-p.h)*(u-p.u)/(q.u-p.u);};

export function buildSkatepark(scene,obstacles){
 const B=new Builder();
 // Power-trowelled park concrete: cooler, smoother and slightly sheened against the limestone paving.
 const concrete=surface('concrete',[1,1],{tileSize:3.2,macro:.08,grime:.35});concrete.color.set('#c4c6c4');concrete.normalScale.set(.22,.22);concrete.roughness=.62;
 const galv=new THREE.MeshStandardMaterial({color:'#c4c9cc',metalness:1,roughness:.3});
 const props=[],rails=[],footprints=[];
 // World point from prop-local (u along the ride direction, v across, y up).
 const toWorld=(p,u,v,y)=>{const [dx,dz]=DIRS[p.dir];return [p.x+dx*u-dz*v,y,p.z+dz*u+dx*v];};
 // Triangles are wound to agree with the analytic normals, whatever the ride direction.
 function mesh(pos,nrm,idx,m){for(let i=0;i<idx.length;i+=3){const [a,b,c]=[idx[i],idx[i+1],idx[i+2]].map(k=>new THREE.Vector3(pos[k*3],pos[k*3+1],pos[k*3+2]));const f=b.sub(a).cross(c.sub(a));const n=new THREE.Vector3(nrm[idx[i]*3],nrm[idx[i]*3+1],nrm[idx[i]*3+2]);if(f.dot(n)<0){const t=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=t;}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nrm,3));g.setIndex(idx);B.add(g,m,0,0,0,0,0,0,1,1,1,true);}
 function tube(points,r,m,seg=8){if(points.length<2)return;const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal',.0);B.add(new THREE.TubeGeometry(c,Math.max(2,points.length*2),r,seg,false),m,0,0,0,0,0,0,1,1,1,true);}
 function prop(p){const pts=profile(p.segments),L=pts[pts.length-1].u,H=pts[pts.length-1].h,w=p.w,[dx,dz]=DIRS[p.dir];p.pts=pts;p.L=L;props.push(p);
  const box=[toWorld(p,0,-w/2,0),toWorld(p,L,w/2,0)];footprints.push({x:(box[0][0]+box[1][0])/2,z:(box[0][2]+box[1][2])/2,w:Math.abs(box[1][0]-box[0][0]),d:Math.abs(box[1][2]-box[0][2])});
  // Riding surface with analytic normals: smooth through transitions, crisp at creases and risers.
  let pos=[],nrm=[],idx=[];const cols=[-w/2,0,w/2];
  pts.forEach((q,i)=>{const n=q.s===Infinity?[-dx,0,-dz]:(()=>{const l=Math.hypot(q.s,1);return [-dx*q.s/l,1/l,-dz*q.s/l];})();for(const v of cols){pos.push(...toWorld(p,q.u,v,q.h));nrm.push(...n);}
   if(i>0){const a=(i-1)*3,b=i*3;for(let k=0;k<2;k++)idx.push(a+k,b+k,a+k+1,b+k,b+k+1,a+k+1);}});
  mesh(pos,nrm,idx,concrete);
  // Side walls and the back wall.
  for(const side of [-1,1]){pos=[];nrm=[];idx=[];const out=[-dz*side,0,dx*side];pts.forEach((q,i)=>{pos.push(...toWorld(p,q.u,side*w/2,0),...toWorld(p,q.u,side*w/2,q.h));nrm.push(...out,...out);if(i>0){const a=(i-1)*2,b=i*2;idx.push(a,b,a+1,b,b+1,a+1);}});
   mesh(pos,nrm,idx,concrete);
   // Bullnose arris along the top edge so nothing reads as a raw box.
   let run=[];const flush=()=>{tube(run.map(q=>toWorld(p,q.u,side*(w/2-.012),q.h-.012)),.03,concrete,6);run=[];};
   for(const q of pts){if(q.s===Infinity){flush();continue;}if(!run.length||q.u-run[run.length-1].u>.02)run.push(q);}flush();
   // Side collision follows the profile height.
   const n=Math.max(4,Math.ceil(L/.6));for(let i=0;i<n;i++){const u=(i+.5)*L/n,h=heightOn(pts,u);if(h<.05)continue;const c=toWorld(p,u,side*w/2,0);
    // Outward normal of this side is (-dz*side, dx*side) in world x/z.
    obstacles.push(dx?{x:c[0],z:c[2],w:L/n,d:.1,h,oneSided:'z',side:dx*side,label:'Obstacle side impact'}:{x:c[0],z:c[2],w:.1,d:L/n,h,oneSided:'x',side:-dz*side,label:'Obstacle side impact'});}}
  if(H>.02){const a=toWorld(p,L,-w/2,0),b=toWorld(p,L,w/2,0);pos=[...a,...b,...toWorld(p,L,w/2,H),...toWorld(p,L,-w/2,H)];const n=[dx,0,dz];nrm=[...n,...n,...n,...n];mesh(pos,nrm,[0,1,2,0,2,3],concrete);
   obstacles.push(dz?{x:p.x+dx*L,z:p.z+dz*L,w,d:.15,h:H,oneSided:'z',side:dz,label:'Obstacle back impact'}:{x:p.x+dx*L,z:p.z,w:.15,d:w,h:H,oneSided:'x',side:dx,label:'Obstacle back impact'});}
  for(const c of p.coping||[]){const h=heightOn(pts,c-.01);tube([toWorld(p,c,-w/2,h+.012),toWorld(p,c,w/2,h+.012)],.03,galv,10);}
  for(const c of p.angle||[]){const h=heightOn(pts,c);tube([toWorld(p,c,-w/2,h-.006),toWorld(p,c,w/2,h-.006)],.018,galv,4);}
  return p;}
 function flatbar(id,ax,az,bx,bz,h){rails.push({id,ax,az,bx,bz,height:h});const len=Math.hypot(bx-ax,bz-az),tx=(bx-ax)/len,tz=(bz-az)/len;
  obstacles.push({x:(ax+bx)/2,z:(az+bz)/2,w:Math.abs(bx-ax)||.14,d:Math.abs(bz-az)||.14,h,label:'Rail impact',railId:id});
  const r=h-.03;tube([[ax-tx*.05,r-.25,az-tz*.05],[ax+tx*.12,r-.02,az+tz*.12],[ax+tx*.4,r,az+tz*.4],[bx-tx*.4,r,bz-tz*.4],[bx-tx*.12,r-.02,bz-tz*.12],[bx+tx*.05,r-.25,bz+tz*.05]],.025,galv,12);
  const legs=Math.max(2,Math.round(len/2.2));for(let i=0;i<=legs;i++){const t=i/legs,x=ax+(bx-ax)*t,z=az+(bz-az)*t;tube([[x,0,z],[x,r-.02,z]],.019,galv,8);B.box(.16,.012,.16,galv,x,.006,z);}}

 // Kickers: 1 m launch ramps with a 32-degree lip and a closed back.
 prop({x:-17,z:11,dir:'-z',w:2.6,segments:[{curve:6.6,deg:32}],angle:[3.49],smooth:true});
 prop({x:17,z:-21,dir:'+z',w:2.6,segments:[{curve:6.6,deg:32}],angle:[3.49],smooth:true});
 // Funbox: 30-degree banks to a 0.75 m table with steel angle on the edges and a flat bar on top.
 const fun=prop({x:0,z:-35.7,dir:'-z',w:5.2,segments:[{bank:1.3,rise:.75},{flat:6},{bank:1.3,rise:-.75}],angle:[1.3,7.3],smooth:true});
 flatbar('funbox',1.4,-37.3,1.4,-42.7,1.1);
 // Bank-to-quarter: 1.5 m quarter pipe (65 degrees) with round coping, a deck and a roll-in bank.
 prop({x:34,z:21.5,dir:'+z',w:6,segments:[{curve:2.6,deg:65},{flat:1.6},{bank:2.6,rise:-1.5}],coping:[2.36],smooth:true});
 // Grind ledge with steel coping (the grind line sits on its top), a manual pad and a stair set.
 prop({x:-30,z:26,dir:'+z',w:.6,segments:[{steps:1,rise:.45,tread:7}]});rails.push({id:'ledge',ax:-30,az:26.2,bx:-30,bz:32.8,height:.57});
 obstacles.push({x:-30,z:29.5,w:.14,d:6.6,h:.57,label:'Ledge impact',railId:'ledge'});
 for(const s of [-1,1])tube([[-30+s*.3,.45,26.05],[-30+s*.3,.45,32.95]],.014,galv,4);
 prop({x:15,z:8.5,dir:'-z',w:8,segments:[{steps:1,rise:.3,tread:2.4}]});
 prop({x:-34,z:-19,dir:'-z',w:4,segments:[{steps:4,rise:.15,tread:.36},{flat:3}]});
 // Flat bars at 45 cm: one straight off the start line, two side by side.
 flatbar('left',-5,4,-5,-6,.45);flatbar('right',5,4,5,-6,.55);
 B.build(scene).forEach(m=>{m.castShadow=m.receiveShadow=true;});
 const height=(x,z)=>{let best=0;for(const p of props){const [dx,dz]=DIRS[p.dir],rx=x-p.x,rz=z-p.z,u=rx*dx+rz*dz,v=-rx*dz+rz*dx;if(u>0&&u<p.L&&Math.abs(v)<p.w/2)best=Math.max(best,heightOn(p.pts,u));}return best;};
 const smooth=(x,z)=>props.some(p=>{if(!p.smooth)return false;const [dx,dz]=DIRS[p.dir],rx=x-p.x,rz=z-p.z,u=rx*dx+rz*dz,v=-rx*dz+rz*dx;return u>-.3&&u<p.L+.3&&Math.abs(v)<p.w/2+.3;});
 // Sky tokens over the lines the props make possible.
 const rings=[[-17,4.2,-3],[17,4.2,-7.5],[0,2.4,-40],[34,2.8,24.6],[-34,1.9,-24]];
 return {height,smooth,rails,footprints,rings};}
