import * as THREE from './vendor/three.module.js';
// Window glass with "interior mapping": every pane ray-traces a small furnished room
// behind it, so facades get parallax, curtains and lit apartments without extra geometry.
// Per-vertex attributes: aRoom = (seed, roomWidth, roomHeight, kind 0 flat / 1 shop / 2 attic),
// aWin = (pane offset x, pane offset y, pane width, pane height) inside that room, in metres.
const ROOM_GLSL=`
varying vec2 vPaneUv;varying vec4 vRoom;varying vec4 vWin;varying vec3 vGlassWorld;varying vec3 vGlassNormal;
float gHash(float n){return fract(sin(n)*43758.5453);}
vec3 gPick(float s,vec3 a,vec3 b,vec3 c,vec3 d){float k=floor(s*4.);return k<1.?a:k<2.?b:k<3.?c:d;}
bool gBox(vec3 ro,vec3 rd,vec3 lo,vec3 hi,out float t,out vec3 n){vec3 inv=1./rd;vec3 t0=(lo-ro)*inv,t1=(hi-ro)*inv;vec3 tmin=min(t0,t1),tmax=max(t0,t1);float a=max(max(tmin.x,tmin.y),tmin.z),b=min(min(tmax.x,tmax.y),tmax.z);if(b<max(a,0.))return false;t=a;n=-sign(rd)*step(tmin.yzx,tmin.xyz)*step(tmin.zxy,tmin.xyz);return true;}
vec3 roomColor(){
 float seed=vRoom.x,kind=vRoom.w;vec3 size=vec3(vRoom.y,vRoom.z,kind>.5&&kind<1.5?6.:4.2);
 vec3 N=normalize(vGlassNormal),U=vec3(0,1,0),T=normalize(cross(U,N));
 vec3 V=normalize(vGlassWorld-cameraPosition);
 vec3 rd=normalize(vec3(dot(V,T),dot(V,U),-dot(V,N)));
 vec3 ro=vec3(vWin.x+vPaneUv.x*vWin.z,vWin.y+vPaneUv.y*vWin.w,0.);
 vec3 tq=(mix(vec3(0),size,step(0.,rd))-ro)/rd;float t=min(min(tq.x,tq.y),tq.z);vec3 p=ro+rd*t;
 vec3 wall=gPick(gHash(seed*7.1),vec3(.80,.76,.68),vec3(.72,.70,.64),vec3(.62,.58,.50),vec3(.78,.62,.48));
 vec3 col;float shade;
 if(t==tq.z){col=wall*.9;shade=.85;
  vec2 f=p.xy;float art=step(abs(f.x-size.x*(.3+.4*gHash(seed*3.3))),.45)*step(abs(f.y-1.65),.32);col=mix(col,gPick(gHash(seed*5.7),vec3(.2,.25,.3),vec3(.5,.3,.2),vec3(.15,.3,.2),vec3(.6,.55,.4)),art);
  float shelf=step(size.x*.7,f.x)*step(f.y,2.1)*step(.5,gHash(seed*9.9));col=mix(col,vec3(.28,.2,.13)*(.7+.3*step(.5,fract(f.y*3.3))),shelf);}
 else if(t==tq.x){col=wall*.8;shade=.7;}
 else if(rd.y<0.){col=kind>.5&&kind<1.5?mix(vec3(.75,.72,.66),vec3(.18),step(.5,fract(floor(p.x*2.)*.5+floor(p.z*2.)*.5))):vec3(.36,.22,.12)*(.8+.2*step(.5,fract(p.x*6.)));shade=.6;}
 else{col=vec3(.86,.84,.80);shade=.95;}
 if(kind>1.5){float slope=step(size.y-1.1+p.z*.28,p.y);col=mix(col,wall*.75,slope);}
 float t2;vec3 n2;vec3 lo=vec3(size.x*(.15+.4*gHash(seed*1.7)),0.,size.z*(.45+.3*gHash(seed*2.9)));vec3 hi=lo+vec3(.8+gHash(seed*4.1)*1.4,.45+gHash(seed*6.2)*.9,.8);
 if(kind>.5&&kind<1.5){lo=vec3(.3,0.,1.6);hi=vec3(size.x-.3,1.05,2.3);}
 if(gBox(ro,rd,lo,hi,t2,n2)&&t2<t){t=t2;p=ro+rd*t;col=gPick(gHash(seed*8.3),vec3(.35,.28,.22),vec3(.22,.28,.35),vec3(.55,.5,.42),vec3(.18,.16,.15));shade=.55+.35*max(n2.y,0.);}
 vec3 e=min(p,size-p);float corner=min(min(e.x,e.y),e.z);shade*=.62+.38*smoothstep(0.,.9,corner);
 shade*=1.-.45*smoothstep(1.,size.z,p.z);
 float lit=step(gHash(seed*13.7),kind>.5&&kind<1.5?.92:.3);
 vec3 light=mix(vec3(.13,.135,.14),vec3(1.,.72,.42)*.9,lit);
 if(lit>.5)light*=.55+.45*smoothstep(3.5,.0,length(p.xz-vec2(size.x*.5,size.z*.45)));
 vec3 c=col*shade*light;
 if(kind<.5||kind>1.5){float cz=.14;float tc=cz/max(rd.z,.001);vec2 q=ro.xy+rd.xy*tc;
  float side=smoothstep(.22,.08,vPaneUv.x)+smoothstep(.78,.92,vPaneUv.x);float sheer=step(.45,gHash(seed*21.3))*.55;
  float a=clamp(max(side*step(.4,gHash(seed*17.1)),sheer),0.,.92)*(.85+.15*sin(q.x*38.+seed));
  vec3 cloth=gPick(gHash(seed*19.1),vec3(.92,.9,.85),vec3(.85,.8,.7),vec3(.55,.18,.16),vec3(.25,.3,.42));
  c=mix(c,cloth*(lit>.5?vec3(1.,.78,.5)*.75:vec3(.22)),a);}
 return c;
}`;
let shared=null;
export function glassMaterial(){if(shared)return shared;const m=new THREE.MeshStandardMaterial({color:'#0b0d0e',roughness:.05,metalness:0,envMapIntensity:1.15});
 m.onBeforeCompile=s=>{
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 aRoom;attribute vec4 aWin;varying vec2 vPaneUv;varying vec4 vRoom;varying vec4 vWin;varying vec3 vGlassWorld;varying vec3 vGlassNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvPaneUv=uv;vRoom=aRoom;vWin=aWin;vGlassWorld=(modelMatrix*vec4(transformed,1.)).xyz;vGlassNormal=normalize(mat3(modelMatrix)*objectNormal);');
  s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\n'+ROOM_GLSL).replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=roomColor()*1.35;');
 };m.customProgramCacheKey=()=>'interior-glass-v1';m.userData.attributes=['aRoom','aWin'];shared=m;return m;}
// Room attributes for a pane geometry (uv must span 0..1 across the pane).
export function roomAttributes(geometry,room,win){const n=geometry.attributes.position.count,a=new Float32Array(n*4),b=new Float32Array(n*4);for(let i=0;i<n;i++){a.set(room,i*4);b.set(win,i*4);}geometry.setAttribute('aRoom',new THREE.BufferAttribute(a,4));geometry.setAttribute('aWin',new THREE.BufferAttribute(b,4));return geometry;}
