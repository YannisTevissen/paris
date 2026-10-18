import * as THREE from './vendor/three.module.js';
// Paris street section. Pavements and the square sit at 0; the carriageway runs 14 cm lower behind
// rounded granite kerbs, with dished cobble gutters and a crowned centre, and the kerbs drop to a
// granite ramp at the zebra crossings. roadHeight() is shared by the geometry, the parked and moving
// cars and the chair physics, so what you see is what you ride on.
export const CROSSINGS=[-66,0,66];
const KERB=.14,X0=-127,X1=127;
const lowered=x=>{let k=0;for(const c of CROSSINGS)k=Math.max(k,1-THREE.MathUtils.smoothstep(Math.abs(x-c),2.2,2.9));return k;};
// Height across the carriageway at distance a from the street axis (64.5..79.5).
function section(a){
 if(a<65.1){const t=(a-64.5)/.6;return -KERB-.012*Math.sin(Math.PI*t)+.01*t;}
 if(a>78.9){const t=(79.5-a)/.6;return -KERB-.012*Math.sin(Math.PI*t)+.01*t;}
 const u=(a-72)/6.9;return -KERB+.01+.06*(1-u*u);}
export function roadHeight(x,z){const a=Math.abs(z);if(x<X0||x>X1||a<=64.2||a>=79.8)return 0;
 if(a<64.5||a>79.5){const t=a<64.5?(a-64.2)/.3:(79.8-a)/.3;return -.11*t*lowered(x);}
 return section(a);}

// World-space grid across the street; heights follow section() so the camber is real geometry.
function grid(B,m,a0,a1,s,n){const pos=[],idx=[];
 for(let j=0;j<=n;j++){const a=a0+(a1-a0)*j/n;for(const x of [X0,0,X1])pos.push(x,section(Math.min(79.5,Math.max(64.5,a))),s*a);}
 for(let j=0;j<n;j++)for(let i=0;i<2;i++){const p=j*3+i,q=p+3;idx.push(...(s>0?[p,q,p+1,q,q+1,p+1]:[p,p+1,q,q,p+1,q+1]));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();B.add(g,m,0,0,0,0,0,0,1,1,1,true);}

// Kerb profile from the pavement edge (d = 0) towards the road: flat top, rounded arris, vertical face.
const KERB_UP=[[0,0],[.24,0],[.27,-.006],[.29,-.02],[.3,-.042],[.3,-.16]];
const KERB_DOWN=[[0,0],[.24,-.085],[.27,-.095],[.29,-.103],[.3,-.112],[.3,-.16]];
function kerb(B,m,edge,dir,s){const xs=new Set([X0,X1]);for(const c of CROSSINGS)for(let x=c-3.2;x<=c+3.2+1e-6;x+=.2)xs.add(+x.toFixed(2));const st=[...xs].sort((a,b)=>a-b);
 const r=s*dir,P=KERB_UP.length,pos=[],idx=[];
 for(const x of st){const k=lowered(x);for(let i=0;i<P;i++){const d=KERB_UP[i][0],y=KERB_UP[i][1]+(KERB_DOWN[i][1]-KERB_UP[i][1])*k;pos.push(x,y,s*(edge+dir*d));}}
 for(let i=0;i<st.length-1;i++)for(let k=0;k<P-1;k++){const A=i*P+k,Bv=A+P,C=A+1,D=Bv+1;idx.push(...(r>0?[A,C,Bv,Bv,C,D]:[A,Bv,C,Bv,D,C]));}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();B.add(g,m,0,0,0,0,0,0,1,1,1,true);}

export function buildStreets(B,M){for(const s of [-1,1]){
 grid(B,M.asphalt,65.1,78.9,s,28);grid(B,M.cobble,64.5,65.1,s,6);grid(B,M.cobble,78.9,79.5,s,6);
 kerb(B,M.granite,64.2,1,s);kerb(B,M.granite,79.8,-1,s);}}

// The square is not a plane: a drainage crown (up to about 13 cm in the middle, back to 0 at the kerbs)
// with soft undulations, and every paving slab laid as its own stone with an eased arris, a sunken
// joint and a few millimetres of height and tilt of its own. Layout matches the paving shader
// Random-length courses; see buildEsplanade.
const SQ={x0:-60,x1:60,z0:-64.2,z1:64.2},SLAB=[1.6,1.05];
export function esplanadeHeight(x,z){if(x<=SQ.x0||x>=SQ.x1||z<=SQ.z0||z>=SQ.z1)return 0;
 const u=(x-SQ.x0)/(SQ.x1-SQ.x0),v=(z-SQ.z0)/(SQ.z1-SQ.z0),e=Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
 return e*(.09+.035*Math.sin(x*.19+1.3)*Math.sin(z*.15+.4)+.02*Math.sin(x*.47+z*.31)+.012*Math.sin(x*1.3-z*.9));}
export const groundHeight=(x,z)=>roadHeight(x,z)||esplanadeHeight(x,z);
export function buildEsplanade(B,m){let seed=4242;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 // Random-length courses like old Paris paving: course depths vary, slab lengths vary, each stone has
 // its own tint and texture patch (rotated), dirt collects in the joints, a few stones have settled
 // and here and there a repair in smaller setts breaks the rhythm.
 m.vertexColors=true;m.userData.attributes=['color'];m.userData.ownUV=true;
 const pos=[],col=[],uv=[],idx=[],bev=.018,joint=.013,T=2.6;
 const stone=(xa,xb,za,zb,small)=>{const sunk=rnd()<.05,lift=(rnd()-.5)*.012-(sunk?.018:0),tx=(rnd()-.5)*(sunk?.03:.01),tz=(rnd()-.5)*(sunk?.03:.01),cx=(xa+xb)/2,cz=(za+zb)/2,w=xb-xa,d=zb-za;
  const top=(x,z)=>esplanadeHeight(x,z)+lift+tx*(x-cx)/w+tz*(z-cz)/d,base=pos.length/3,b=small?.012:bev;
  const odd=rnd(),shade=(odd<.06?.62:odd>.95?1.12:.78)+rnd()*.32,warm=(rnd()-.5)*.14+(odd>.95?.06:0),tint=[shade*(1+warm),shade,shade*(1-warm)*(small?.92:1)],dirt=[.42,.4,.37];
  const ou=rnd()*7,ov=rnd()*7,rot=rnd()<.5;const UV=(x,z)=>rot?[z/T+ou,x/T+ov]:[x/T+ou,z/T+ov];
  const o=[[xa,za],[xb,za],[xb,zb],[xa,zb]],t=[[xa+b,za+b],[xb-b,za+b],[xb-b,zb-b],[xa+b,zb-b]];
  for(const [x,z] of t){pos.push(x,top(x,z),z);col.push(...tint);uv.push(...UV(x,z));}
  for(const [x,z] of o){pos.push(x,esplanadeHeight(x,z)-joint,z);col.push(...dirt.map((v,k)=>v*tint[k]));uv.push(...UV(x,z));}
  idx.push(base,base+2,base+1,base,base+3,base+2);for(let k=0;k<4;k++){const k2=(k+1)%4;idx.push(base+k,base+4+k2,base+4+k,base+k,base+k2,base+4+k2);}};
 for(let za=SQ.z0;za<SQ.z1-.05;){const depth=Math.min(SQ.z1-za,[.75,.9,1.05,1.2][Math.floor(rnd()*4)]),zb=za+depth;
  for(let xa=SQ.x0;xa<SQ.x1-.05;){const len=Math.min(SQ.x1-xa,.7+rnd()*1.6),xb=xa+len;
   if(rnd()<.012){// Repair patch in small granite setts.
    for(let sx=xa;sx<xb-.05;sx+=.2)for(let sz=za;sz<zb-.05;sz+=.2)stone(sx,Math.min(xb,sx+.2),sz,Math.min(zb,sz+.2),true);}
   else stone(xa,xb,za,zb,false);xa=xb;}
  za=zb;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
 B.add(g,m,0,0,0,0,0,0,1,1,1,true);}
