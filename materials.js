import * as THREE from './vendor/three.module.js';
// Scanned PBR surfaces plus shader patches that hide tiling: stochastic sampling,
// per-slab offsets, world-space colour variation, grime near the ground and wet patches.
let seed=1301;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
const noiseGrid=Array.from({length:1024},()=>random()*2-1);function noise(x,y,period){const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const at=(a,b)=>noiseGrid[(a%period)+(b%period)*32];return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;}
function canvas(w=1024,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function texture(c,color=false,repeat=[1,1]){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;return t}
const cache=new Map();const scanned=new Map();
// Metres covered by one texture tile, per scanned set.
const TILE={stone:4,concrete:4,asphalt:4,limestone:5,fabric:.65,leather:.5,cobble:2.2,bark:1.4,slate:2.4,granite:2,gravel:2.6};
const KINDS=['concrete','asphalt','limestone','fabric','leather','cobble','bark','slate','granite','gravel'];
export const sunUniform={value:new THREE.Vector3(.6,.35,.7).normalize()},sunLevel={value:1};
// Shared by every wet ground material; filled each frame by reflections.js.
export const reflectionUniforms={tReflect:{value:null},reflectMatrix:{value:new THREE.Matrix4()},reflectStrength:{value:0}};
export async function preparePBR(){const loader=new THREE.TextureLoader();let done=0;await Promise.all(KINDS.map(async kind=>{try{const maps=await Promise.all(['color','normal','roughness'].map(channel=>loader.loadAsync('./assets/'+kind+'-'+channel+'.jpg')));maps.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(i===0)t.colorSpace=THREE.SRGBColorSpace;});scanned.set(kind,maps);}catch(e){console.warn('Material fallback:',kind);}done++;const node=document.getElementById('load-status');if(node)node.textContent='Loading scanned surfaces · '+done+'/'+KINDS.length;}));}
export function worldUV(geometry,tileSize=4){const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){const ax=Math.abs(n.getX(i)),ay=Math.abs(n.getY(i)),az=Math.abs(n.getZ(i));uv[i*2]=(ax>ay&&ax>az?p.getZ(i):p.getX(i))/tileSize;uv[i*2+1]=(ay>ax&&ay>az?p.getZ(i):p.getY(i))/tileSize;}geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));}

// Default variation per scanned kind; callers can override any field.
const LOOK={
 concrete:{noTile:true,macro:.16,grime:1.2},asphalt:{noTile:true,macro:.22,wet:.5},limestone:{noTile:true,macro:.1,grime:2.2,streaks:.22},
 cobble:{noTile:true,macro:.18,wet:.35},slate:{noTile:true,macro:.12},granite:{noTile:true,macro:.12},gravel:{noTile:true,macro:.2},bark:{noTile:true,macro:.1},
 fabric:{},leather:{}
};
export function surface(kind,repeat=[1,1],look={}){const key=kind+repeat.join();if(scanned.has(kind)){const [map,normalMap,roughnessMap]=scanned.get(kind);const m=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,roughness:1,normalScale:new THREE.Vector2(.6,.6)});m.userData.scanned=true;m.userData.tileSize=look.tileSize||TILE[kind]||4;const options={...LOOK[kind],...look};if(options.noTile||options.macro||options.slabs)enhance(m,options);return m;}if(cache.has(key))return cache.get(key).clone();const c=canvas(),b=canvas(),g=c.getContext('2d'),h=b.getContext('2d');const base={stone:[158,155,143],concrete:[153,157,151],limestone:[199,188,167],asphalt:[58,64,65],rubber:[34,37,39],fabric:[102,111,100],wood:[104,79,55]}[kind]||[128,128,128];
 const ci=g.createImageData(1024,1024),bi=h.createImageData(1024,1024);
 for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){let i=(y*1024+x)*4;const grain=(random()-.5)*(kind==='asphalt'?42:18);const clouds=12*noise(x/128,y/128,8)+5*noise(x/32,y/32,32);let n=grain+clouds;if(kind==='wood')n+=12*Math.sin(y*.3+4*Math.sin(x*.012));if(kind==='fabric')n+=((x%4<2?1:-1)+(y%4<2?1:-1))*7;if(kind==='rubber')n+=x%64<8?-19:0;for(let k=0;k<3;k++){ci.data[i+k]=base[k]+n;bi.data[i+k]=128+n*2}ci.data[i+3]=bi.data[i+3]=255;}g.putImageData(ci,0,0);h.putImageData(bi,0,0);
 const map=texture(c,true,repeat),bumpMap=texture(b,false,repeat);const result=new THREE.MeshStandardMaterial({map,bumpMap,bumpScale:.018,roughness:kind==='rubber'?.94:.88,metalness:0});cache.set(key,result);return result.clone();
}

// GLSL shared by every patched material.
const NOISE_GLSL=`
varying vec3 vNtWorld;varying vec3 vNtNormal;vec2 ntBevel=vec2(0.);
float ntHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
vec2 ntHash2(vec2 p){return vec2(ntHash(p),ntHash(p+19.19));}
float ntNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(ntHash(i),ntHash(i+vec2(1,0)),u.x),mix(ntHash(i+vec2(0,1)),ntHash(i+vec2(1,1)),u.x),u.y);}
float ntFbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*ntNoise(p);p=p*2.03+17.1;a*=.5;}return s;}
vec2 ntOffA=vec2(0),ntOffB=vec2(0),ntDx=vec2(0),ntDy=vec2(0),ntDistort=vec2(0);float ntW=0.;float ntWet=0.;float ntJoint=0.;float ntCell=.5;
vec4 ntSample(sampler2D s,vec2 uv){
#ifdef NT_TILE
 vec4 a=textureGrad(s,uv+ntOffA,ntDx,ntDy);if(ntW<.001)return a;vec4 b=textureGrad(s,uv+ntOffB,ntDx,ntDy);return mix(a,b,ntW);
#else
 return texture2D(s,uv);
#endif
}
vec2 ntPlane(){return abs(vNtNormal.y)>.6?vNtWorld.xz:vec2(vNtWorld.x+vNtWorld.z,vNtWorld.y);}
void ntSetup(vec2 uv){
 ntDx=dFdx(uv);ntDy=dFdy(uv);
#ifdef NT_SLABS
 vec2 sp=vNtWorld.xz/NT_SLABS;float row=floor(sp.y);sp.x+=fract(row*.5)*1.;vec2 cell=floor(sp),fc=fract(sp);
 vec2 edge=min(fc,1.-fc)*NT_SLABS;ntJoint=1.-smoothstep(NT_JOINT*.35,NT_JOINT,min(edge.x,edge.y));
 ntCell=ntHash(cell);ntOffA=ntHash2(cell)*7.31;ntOffB=ntOffA;ntW=0.;
 // Chamfered arrises and a slight per-slab tilt: the paving catches grazing light like laid stone.
 vec2 toward=vec2(fc.x<.5?-1.:1.,fc.y<.5?-1.:1.),bev=1.-smoothstep(0.,.035,edge);
 ntBevel=toward*bev*.55+(ntHash2(cell+3.7)-.5)*.05;
#else
 float k=ntNoise(uv*NT_FREQ+vec2(3.7,1.3));float l=k*7.;float f=fract(l);float ia=floor(l);
 ntOffA=sin(vec2(3.,7.)*ia)*vec2(.71,.53)+ia*.37;ntOffB=sin(vec2(3.,7.)*(ia+1.))*vec2(.71,.53)+(ia+1.)*.37;ntW=smoothstep(.25,.75,f);
#endif
#ifdef NT_WET
 float puddle=ntFbm(vNtWorld.xz*.12+3.1)*.85+ntFbm(vNtWorld.xz*.035+9.7)*.25+ntNoise(vNtWorld.xz*.9)*.06;ntWet=smoothstep(.66-NT_WET*.12,.7-NT_WET*.12,puddle)*step(.6,vNtNormal.y);
#endif
}`;
export function enhance(m,o={}){const defines={NT_FREQ:(o.freq??.55).toFixed(3)};if(o.noTile!==false)defines.NT_TILE='';if(o.slabs){defines.NT_SLABS=`vec2(${o.slabs[0].toFixed(3)},${o.slabs[1].toFixed(3)})`;defines.NT_JOINT=(o.joint??.012).toFixed(4);defines.NT_TILE='';}if(o.wet)defines.NT_WET=o.wet.toFixed(3);if(o.reflect)defines.NT_REFLECT='';
 const macro=(o.macro??0).toFixed(3),grime=(o.grime??0).toFixed(3),streaks=(o.streaks??0).toFixed(3),slabTint=(o.slabTint??.18).toFixed(3),base=(o.base??0).toFixed(3);
 m.defines={...(m.defines||{}),...defines};
 m.onBeforeCompile=shader=>{if(o.reflect)Object.assign(shader.uniforms,reflectionUniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vNtWorld;varying vec3 vNtNormal;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
 vec4 ntW4=vec4(transformed,1.);
 #ifdef USE_INSTANCING
 ntW4=instanceMatrix*ntW4;
 #endif
 ntW4=modelMatrix*ntW4;vNtWorld=ntW4.xyz;vNtNormal=normalize(mat3(modelMatrix)*objectNormal);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+NOISE_GLSL+(o.reflect?'\nuniform sampler2D tReflect;uniform mat4 reflectMatrix;uniform float reflectStrength;':'')).replace('#include <map_fragment>',`
#if defined(USE_MAP)
 ntSetup(vMapUv);
#elif defined(USE_NORMALMAP)
 ntSetup(vNormalMapUv);
#endif
#ifdef USE_MAP
 #ifdef NT_TILE
 vec4 ntA=textureGrad(map,vMapUv+ntOffA,ntDx,ntDy),ntB=textureGrad(map,vMapUv+ntOffB,ntDx,ntDy);
 ntW=clamp(ntW-.12*dot(ntA.rgb-ntB.rgb,vec3(1.)),0.,1.);
 #ifdef NT_SLABS
 ntW=0.;
 #endif
 diffuseColor*=mix(ntA,ntB,ntW);
 #else
 diffuseColor*=texture2D(map,vMapUv);
 #endif
#endif
 {vec2 wp=ntPlane();
 float macro=ntFbm(wp*.07)*.65+ntFbm(wp*.31)*.35;diffuseColor.rgb*=1.+${macro}*(macro*2.-1.);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.04,1.,.93),${macro}*2.*ntNoise(wp*.019));
 float vertical=1.-abs(vNtNormal.y);
 float h=vNtWorld.y-${base};
 diffuseColor.rgb*=1.-vertical*${grime}*.2*(1.-smoothstep(0.,1.6,h))*(.75+.25*ntNoise(wp*vec2(1.7,.3)));
 diffuseColor.rgb*=1.-vertical*${streaks}*smoothstep(.55,.95,ntNoise(vec2(wp.x*2.3,wp.y*.09)))*(.6+.4*ntNoise(wp*vec2(9.,.8)));
 diffuseColor.rgb*=1.-step(.6,vNtNormal.y)*${grime}*.08*smoothstep(.55,.9,ntFbm(wp*.5));
 #ifdef NT_SLABS
 diffuseColor.rgb*=(1.-${slabTint}*.5+${slabTint}*ntCell)*mix(1.,.5,ntJoint);
 #endif
 #ifdef NT_WET
 diffuseColor.rgb*=mix(1.,.62,ntWet);
 #endif
 }`).replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;
#ifdef USE_ROUGHNESSMAP
 roughnessFactor*=ntSample(roughnessMap,vRoughnessMapUv).g;
#endif
#ifdef NT_SLABS
 roughnessFactor=mix(roughnessFactor,1.,ntJoint*.6);
#endif
#ifdef NT_WET
 roughnessFactor=mix(roughnessFactor,.06,ntWet);
#endif`).replace('#include <normal_fragment_maps>',`#if defined( USE_NORMALMAP_TANGENTSPACE )
 vec3 mapN=ntSample(normalMap,vNormalMapUv).xyz*2.-1.;mapN.xy*=normalScale;mapN.xy+=ntBevel*step(.6,vNtNormal.y);ntDistort=mapN.xy;
 #ifdef NT_WET
 mapN=mix(mapN,vec3(0,0,1),ntWet*.9);
 #endif
 normal=normalize(tbn*mapN);
#else
 #include <normal_fragment_maps>
#endif`).replace('#include <opaque_fragment>',`#ifdef NT_REFLECT
{vec4 rc=reflectMatrix*vec4(vNtWorld,1.);vec2 ruv=rc.xy/rc.w+ntDistort*mix(.03,.006,ntWet);vec3 refl=texture2D(tReflect,clamp(ruv,.001,.999)).rgb;
 float fres=.04+.96*pow(1.-saturate(dot(normalize(normal),normalize(vViewPosition))),5.);
 float w=reflectStrength*mix(.16*fres*(1.-roughnessFactor),.3+.7*fres,ntWet);outgoingLight=mix(outgoingLight,refl,clamp(w,0.,.95));}
#endif
#include <opaque_fragment>`);
 };
 m.customProgramCacheKey=()=>'nt|'+JSON.stringify(defines)+macro+grime+streaks+slabTint+base;m.userData.enhanced=true;return m;}

// Procedural maps for things no scan covers: zinc roofs, wrought iron, leaves, lattice, signage.
export function zincMaps(){if(cache.has('zinc'))return cache.get('zinc');const c=canvas(512),b=canvas(512),g=c.getContext('2d'),h=b.getContext('2d');g.fillStyle='#8f989c';g.fillRect(0,0,512,512);h.fillStyle='#808080';h.fillRect(0,0,512,512);for(let i=0;i<9000;i++){const v=random();g.fillStyle=v>.5?'rgba(255,255,255,.035)':'rgba(30,40,45,.05)';g.fillRect(random()*512,random()*512,1+random()*6,1+random()*2);}for(let x=0;x<512;x+=64){const grd=h.createLinearGradient(x-5,0,x+5,0);grd.addColorStop(0,'#808080');grd.addColorStop(.35,'#d0d0d0');grd.addColorStop(.65,'#303030');grd.addColorStop(1,'#808080');h.fillStyle=grd;h.fillRect(x-5,0,10,512);g.fillStyle='rgba(40,45,50,.25)';g.fillRect(x+4,0,3,512);}for(let i=0;i<40;i++){g.fillStyle=`rgba(60,58,50,${.04+random()*.06})`;g.fillRect(random()*512,0,8+random()*30,512);}const r={map:texture(c,true),bumpMap:texture(b)};cache.set('zinc',r);return r;}
export function railingTexture(){if(cache.has('rail'))return cache.get('rail');const c=canvas(256,256),g=c.getContext('2d');g.clearRect(0,0,256,256);g.strokeStyle='#fff';g.lineCap='round';
 g.lineWidth=10;g.beginPath();g.moveTo(0,8);g.lineTo(256,8);g.moveTo(0,250);g.lineTo(256,250);g.stroke();g.lineWidth=6;g.beginPath();g.moveTo(0,40);g.lineTo(256,40);g.moveTo(0,215);g.lineTo(256,215);g.stroke();
 g.lineWidth=5;for(let x=16;x<256;x+=32){g.beginPath();g.moveTo(x,40);g.lineTo(x,215);g.stroke();}
 g.lineWidth=4;for(let x=0;x<=256;x+=64){g.beginPath();g.ellipse(x+32,128,24,40,0,0,Math.PI*2);g.stroke();g.beginPath();g.moveTo(x+32,40);g.bezierCurveTo(x+12,60,x+12,80,x+32,88);g.moveTo(x+32,40);g.bezierCurveTo(x+52,60,x+52,80,x+32,88);g.moveTo(x+32,215);g.bezierCurveTo(x+12,195,x+12,175,x+32,168);g.moveTo(x+32,215);g.bezierCurveTo(x+52,195,x+52,175,x+32,168);g.stroke();g.beginPath();g.arc(x+32,128,9,0,Math.PI*2);g.stroke();}
 const t=texture(c);t.anisotropy=4;cache.set('rail',t);return t;}
export function leafTexture(){if(cache.has('leaf'))return cache.get('leaf');const c=canvas(512),g=c.getContext('2d');g.clearRect(0,0,512,512);
 const leaf=(x,y,s,a,col)=>{g.save();g.translate(x,y);g.rotate(a);g.scale(s,s);g.fillStyle=col;g.beginPath();g.moveTo(0,22);for(let i=0;i<=5;i++){const t=-Math.PI*.95+i*Math.PI*.38;const r=i%2?13:22;g.lineTo(Math.sin(t)*r,-Math.cos(t)*r*.9);if(i<5){const t2=t+Math.PI*.19;g.lineTo(Math.sin(t2)*9,-Math.cos(t2)*8);}}g.closePath();g.fill();g.strokeStyle='rgba(30,40,10,.35)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,22);g.lineTo(0,-18);g.moveTo(0,4);g.lineTo(-14,-8);g.moveTo(0,4);g.lineTo(14,-8);g.stroke();g.restore();};
 g.strokeStyle='#4b3b26';g.lineWidth=3;for(let i=0;i<7;i++){g.beginPath();g.moveTo(256,500);g.quadraticCurveTo(256+(random()-.5)*200,300,60+random()*390,40+random()*300);g.stroke();}
 for(let i=0;i<150;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*220;const x=256+Math.cos(a)*r,y=230+Math.sin(a)*r*.95;if(y>480)continue;const l=40+random()*35|0,s=1.1+random()*1.2;const hue=78+random()*28;leaf(x,y,s,random()*Math.PI*2,`hsl(${hue},${38+random()*20}%,${l*.55+10}%)`);}
 const t=texture(c,true);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;cache.set('leaf',t);return t;}
export function latticeTexture(){if(cache.has('lattice'))return cache.get('lattice');const c=canvas(256,256),g=c.getContext('2d');g.clearRect(0,0,256,256);g.strokeStyle='#fff';g.lineWidth=14;g.strokeRect(0,0,256,256);g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.lineTo(256,256);g.moveTo(256,0);g.lineTo(0,256);g.moveTo(0,128);g.lineTo(256,128);g.moveTo(128,0);g.lineTo(128,256);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(0,64);g.lineTo(128,0);g.moveTo(128,256);g.lineTo(256,192);g.moveTo(0,192);g.lineTo(128,256);g.moveTo(128,0);g.lineTo(256,64);g.stroke();const t=texture(c);cache.set('lattice',t);return t;}
// One atlas row per shop sign; returns the texture and the v range of each cell.
export const SHOPS=[['BOULANGERIE','#26352b','#e9d9a8'],['CAFÉ DE LA PLACE','#5b1d22','#f1dfb2'],['PHARMACIE','#1f3b2d','#9ee07c'],['TABAC · PRESSE','#14233a','#e8c46a'],['BRASSERIE DU TROCADÉRO','#1b1b1b','#d8b36a'],['LIBRAIRIE','#2e2a4a','#efe6cf'],['FROMAGERIE','#e9e1cc','#3b4a2f'],['FLEURISTE','#33452f','#f4e9d6'],['BISTROT','#5a2318','#f3e3be'],['CHOCOLATIER','#3a2418','#e2c38c'],['OPTIQUE','#f0ece2','#1c2a3a'],['CAVE À VINS','#3d1420','#e9cf9a']];
export function signAtlas(){if(cache.has('signs'))return cache.get('signs');const rows=SHOPS.length,c=canvas(1024,rows*96),g=c.getContext('2d');SHOPS.forEach(([text,bg,fg],i)=>{const y=i*96;g.fillStyle=bg;g.fillRect(0,y,1024,96);g.strokeStyle=fg;g.globalAlpha=.55;g.lineWidth=2;g.strokeRect(10,y+9,1004,78);g.globalAlpha=1;g.fillStyle=fg;g.font='600 54px "Didot","Bodoni 72","Georgia",serif';g.textAlign='center';g.textBaseline='middle';const w=g.measureText(text).width;g.save();g.translate(512,y+50);if(w>940)g.scale(940/w,1);g.fillText(text,0,0);g.restore();});const t=texture(c,true);t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;const r={texture:t,rows};cache.set('signs',r);return r;}
export function stripeAtlas(){if(cache.has('stripes'))return cache.get('stripes');const c=canvas(256,512),g=c.getContext('2d');const sets=[['#7a1f24','#efe4cf'],['#1f4a37','#1f4a37'],['#233a5c','#e9e2d0'],['#5a1f1f','#5a1f1f']];sets.forEach(([a,b],i)=>{for(let x=0;x<256;x+=32){g.fillStyle=(x/32)%2?b:a;g.fillRect(x,i*128,32,128);}g.fillStyle='rgba(0,0,0,.12)';for(let k=0;k<400;k++)g.fillRect(random()*256,i*128+random()*128,1,2+random()*6);});const t=texture(c,true);t.wrapT=THREE.ClampToEdgeWrapping;cache.set('stripes',t);return t;}
export function decalTexture(kind){const key='decal-'+kind;if(cache.has(key))return cache.get(key);const c=canvas(256,256),g=c.getContext('2d');g.clearRect(0,0,256,256);
 if(kind==='manhole'){g.fillStyle='#2b2d2c';g.beginPath();g.arc(128,128,124,0,7);g.fill();g.fillStyle='#4a4b47';g.beginPath();g.arc(128,128,112,0,7);g.fill();g.strokeStyle='#2a2b29';g.lineWidth=5;for(let r=20;r<110;r+=18){g.beginPath();g.arc(128,128,r,0,7);g.stroke();}for(let a=0;a<12;a++){g.beginPath();g.moveTo(128,128);g.lineTo(128+Math.cos(a*Math.PI/6)*110,128+Math.sin(a*Math.PI/6)*110);g.stroke();}g.fillStyle='#585a55';g.font='bold 20px sans-serif';g.textAlign='center';g.fillText('VILLE DE PARIS',128,62);g.fillText('EAU',128,206);}
 if(kind==='drain'){g.fillStyle='#252624';g.fillRect(8,60,240,136);g.fillStyle='#4c4d48';for(let x=20;x<240;x+=18)g.fillRect(x,72,8,112);}
 if(kind==='stain'){for(let i=0;i<70;i++){const a=random()*7,r=random()*90;g.fillStyle=`rgba(15,15,12,${.03+random()*.05})`;g.beginPath();g.ellipse(128+Math.cos(a)*r*.6,128+Math.sin(a)*r*.6,10+random()*40,8+random()*30,random()*3,0,7);g.fill();}}
 if(kind==='paint'){g.fillStyle='#f4f1e6';g.fillRect(0,0,256,256);g.globalCompositeOperation='destination-out';for(let i=0;i<900;i++){g.fillStyle=`rgba(0,0,0,${.2+random()*.8})`;g.fillRect(random()*256,random()*256,1+random()*7,1+random()*4);}g.globalCompositeOperation='source-over';}
 if(kind==='leaves'){for(let i=0;i<26;i++){const x=20+random()*216,y=20+random()*216,s=.6+random()*.8;g.save();g.translate(x,y);g.rotate(random()*7);g.scale(s,s);g.fillStyle=`hsl(${28+random()*22},${45+random()*20}%,${30+random()*18}%)`;g.beginPath();for(let k=0;k<10;k++){const a=k/10*Math.PI*2,r=k%2?7:16;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.fill();g.restore();}}
 if(kind==='grate'){g.strokeStyle='#fff';g.lineWidth=6;for(let r=30;r<124;r+=16){g.beginPath();g.arc(128,128,r,0,7);g.stroke();}g.lineWidth=5;for(let a=0;a<24;a++){g.beginPath();g.moveTo(128+Math.cos(a*Math.PI/12)*30,128+Math.sin(a*Math.PI/12)*30);g.lineTo(128+Math.cos(a*Math.PI/12)*124,128+Math.sin(a*Math.PI/12)*124);g.stroke();}g.globalCompositeOperation='destination-out';g.beginPath();g.arc(128,128,26,0,7);g.fill();}
 const t=texture(c,kind!=='grate');t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;cache.set(key,t);return t;}
export function farFacadeTexture(){if(cache.has('far'))return cache.get('far');const c=canvas(512,512),g=c.getContext('2d');g.fillStyle='#d8cab0';g.fillRect(0,0,512,512);for(let i=0;i<2500;i++){g.fillStyle=random()>.5?'rgba(255,250,235,.05)':'rgba(70,60,45,.05)';g.fillRect(random()*512,random()*512,2+random()*14,2+random()*8);}
 for(let f=0;f<4;f++){const y=f*128;g.fillStyle='rgba(120,105,85,.35)';g.fillRect(0,y+120,512,8);if(f===1||f===3){g.fillStyle='#2a2a28';g.fillRect(0,y+86,512,4);for(let x=0;x<512;x+=6)g.fillRect(x,y+88,2,26);}
  for(let x=0;x<512;x+=128){const lit=random()<.14;g.fillStyle=lit?'#e9b46c':`rgb(${38+random()*22|0},${42+random()*22|0},${48+random()*24|0})`;g.fillRect(x+40,y+22,48,86);g.fillStyle='rgba(240,232,215,.9)';g.fillRect(x+36,y+18,56,5);g.fillRect(x+36,y+18,5,92);g.fillRect(x+87,y+18,5,92);g.fillStyle='rgba(235,228,212,.7)';g.fillRect(x+62,y+22,3,86);}}
 const t=texture(c,true);cache.set('far',t);return t;}
export function parkTexture(){if(cache.has('park'))return cache.get('park');const c=canvas(1024,1024),g=c.getContext('2d');g.fillStyle='#55683a';g.fillRect(0,0,1024,1024);for(let i=0;i<3000;i++){g.fillStyle=`hsla(${80+random()*30},${25+random()*20}%,${22+random()*18}%,.35)`;g.beginPath();g.arc(random()*1024,random()*1024,4+random()*20,0,7);g.fill();}g.fillStyle='#cdbf9f';for(let x=0;x<1024;x+=256)g.fillRect(x,0,26,1024);for(let y=0;y<1024;y+=256)g.fillRect(0,y,1024,18);const t=texture(c,true);cache.set('park',t);return t;}
export function addSky(scene){const geo=new THREE.SphereGeometry(350,32,16);const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#6090ae')},horizon:{value:new THREE.Color('#ead9b7')},sunDirection:{value:new THREE.Vector3(-55,85,40).normalize()}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vDirection; uniform vec3 top;uniform vec3 horizon;uniform vec3 sunDirection;void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.0),0.45);vec3 c=mix(horizon,top,h);float glow=pow(max(dot(d,sunDirection),0.0),24.0);float disk=smoothstep(0.9995,0.9998,dot(d,sunDirection));c+=vec3(1.0,0.65,0.3)*glow*0.3+vec3(1.0,0.85,0.5)*disk*2.0;gl_FragColor=vec4(c,1.0);}'});scene.add(new THREE.Mesh(geo,material));}
// Merge static material batches to leave the frame budget for physics and shadows.
// Meshes already merged by a Builder carry userData.static and are left alone.
export function batchStatic(scene,exclude){scene.updateMatrixWorld(true);const groups=new Map(),remove=[];scene.traverse(o=>{if(!o.isMesh||o.userData.static||exclude.has(o)||!o.geometry.attributes.normal||Array.isArray(o.material)||o.material.isShaderMaterial)return;let key=o.material.uuid;let entry=groups.get(key);if(!entry){entry={material:o.material,parts:[]};groups.set(key,entry)}const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);entry.parts.push(geo);remove.push(o)});for(const {material,parts}of groups.values()){const geo=new THREE.BufferGeometry();for(const name of ['position','normal','uv']){if(!parts.every(g=>g.attributes[name]))continue;const size=parts.reduce((n,g)=>n+g.attributes[name].array.length,0),array=new Float32Array(size);let offset=0;for(const g of parts){array.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length}geo.setAttribute(name,new THREE.BufferAttribute(array,name==='uv'?2:3));}const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);parts.forEach(p=>p.dispose())}remove.forEach(o=>o.removeFromParent());}
