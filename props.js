import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {surface,railingTexture} from './materials.js';
import {placeModel} from './models.js';
let MODELS={};
// Paris street furniture: cast-iron lamps, bollards, benches, a Wallace fountain,
// a Morris column, litter hoops and a café terrace. Shapes are lathed or assembled.
let seed=99;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const lathe=(pts,seg=14)=>new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),seg);
const LAMP=lathe([[0,0],[.24,0],[.24,.1],[.2,.16],[.2,.26],[.15,.34],[.13,.6],[.1,.72],[.105,.8],[.085,.86],[.075,1.4],[.065,3.3],[.085,3.36],[.085,3.42],[.06,3.5],[.07,3.62],[0,3.62]],16);
const BOLLARD=lathe([[0,0],[.075,0],[.075,.05],[.058,.09],[.055,.72],[.072,.75],[.072,.79],[.05,.81],[.072,.86],[.06,.92],[.03,.95],[0,.955]],12);
const FINIAL=lathe([[0,0],[.06,0],[.04,.05],[.05,.12],[.02,.2],[0,.24]],8);

function materials(){const iron=new THREE.MeshStandardMaterial({color:'#1f2622',roughness:.38,metalness:.6});const bronze=new THREE.MeshStandardMaterial({color:'#2b3a2e',roughness:.32,metalness:.55});const brown=new THREE.MeshStandardMaterial({color:'#2f2921',roughness:.4,metalness:.4});
 const lantern=new THREE.MeshStandardMaterial({color:'#2a2418',emissive:'#ffcf8a',emissiveIntensity:2.6,roughness:.2,side:THREE.DoubleSide});lantern.userData.castShadow=false;
 const slats=surface('concrete',[1,1],{tileSize:1,macro:.1});slats.color.set('#5e7a52');
 const wood=new THREE.MeshStandardMaterial({color:'#6b4c33',roughness:.55});
 const marble=new THREE.MeshStandardMaterial({color:'#efece6',roughness:.18});
 const rattan=new THREE.MeshStandardMaterial({color:'#b48a52',roughness:.7});const weave=new THREE.MeshStandardMaterial({color:'#1f3f6b',roughness:.6});
 const bag=new THREE.MeshStandardMaterial({color:'#8fb27a',roughness:.35,transparent:true,opacity:.85});bag.userData.castShadow=false;
 const poster=new THREE.MeshStandardMaterial({map:posterTexture(),roughness:.7});
 const parasol=new THREE.MeshStandardMaterial({color:'#7b1f24',roughness:.85,side:THREE.DoubleSide});
 return {iron,bronze,brown,lantern,slats,wood,marble,rattan,weave,bag,poster,parasol};}
function posterTexture(){const c=document.createElement('canvas');c.width=1024;c.height=256;const g=c.getContext('2d');const colors=['#d94b2b','#f2c14e','#2b4b7a','#e8e2d0','#1f1f1f','#6a8f4e','#c83c6b'];for(let i=0;i<8;i++){const x=i*128;g.fillStyle=colors[i%colors.length];g.fillRect(x,0,128,256);g.fillStyle=i%2?'#fff':'#111';g.font='bold 22px Helvetica, Arial, sans-serif';g.save();g.translate(x+64,60);g.textAlign='center';g.fillText(['THÉÂTRE','OPÉRA','EXPO','CINÉMA','CONCERT','MUSÉE','BALLET','JAZZ'][i],0,0);g.font='14px Helvetica, Arial, sans-serif';g.fillText('PARIS · OCTOBRE',0,26);g.restore();g.fillStyle='rgba(0,0,0,.15)';g.fillRect(x+16,96,96,120);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;}

// Lamp positions, so the night lighting can put real light pools under the nearest ones.
export const LAMPS=[];
function lamp(B,M,x,z,obstacles,ry=0){LAMPS.push({x,z});if(placeModel(B,MODELS.street_lamp_01,x,0,z,ry+Math.PI/4,1.15)){obstacles.push({x,z,w:.5,d:.5,h:4.5,label:'Lamp post impact'});return;}B.add(LAMP,M.iron,x,0,z);B.push(x,3.62,z,ry);
 const lo=.13,hi=.26,y0=.1,y1=.72;for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;const c=(r,y)=>[Math.cos(a)*r*Math.SQRT2,y,Math.sin(a)*r*Math.SQRT2];const d=(r,y)=>[Math.cos(a+Math.PI/2)*r*Math.SQRT2,y,Math.sin(a+Math.PI/2)*r*Math.SQRT2];B.quad(M.lantern,c(lo,y0),d(lo,y0),d(hi,y1),c(hi,y1));B.box(.025,.64,.025,M.iron,Math.cos(a)*((lo+hi)/2)*Math.SQRT2,.41,Math.sin(a)*((lo+hi)/2)*Math.SQRT2,0,0,0);}
 B.add(lathe([[0,0],[.15,0],[.15,.1],[0,.1]],4),M.iron,0,0,0,0,Math.PI/4);B.add(lathe([[0,0],[.36,0],[.36,.04],[.2,.16],[.06,.3],[0,.33]],4),M.iron,0,y1,0,0,Math.PI/4);B.add(FINIAL,M.iron,0,y1+.3,0);B.pop();
 obstacles.push({x,z,w:.5,d:.5,h:4.5,label:'Lamp post impact'});}
function bench(B,M,x,z,ry,obstacles){B.push(x,0,z,ry);for(const s of [-.85,.85]){B.box(.07,.42,.5,M.iron,s,.21,0);B.box(.07,.06,.62,M.iron,s,.44,.02);B.box(.07,.5,.06,M.iron,s,.72,-.27,0,-.18);}
 for(let i=0;i<4;i++)B.box(1.95,.035,.1,M.slats,0,.47,.22-i*.13);for(let i=0;i<3;i++)B.box(1.95,.1,.035,M.slats,0,.62+i*.14,-.3-i*.025,0,-.18);B.pop();
 obstacles.push({x,z,w:Math.abs(Math.cos(ry))*2+Math.abs(Math.sin(ry))*.8,d:Math.abs(Math.sin(ry))*2+Math.abs(Math.cos(ry))*.8,h:1,label:'Bench impact'});}
function wallace(B,M,x,z,obstacles){B.push(x,0,z);B.cyl(.62,.7,.18,M.bronze,0,.09,0,8);B.cyl(.5,.55,.5,M.bronze,0,.43,0,8);B.cyl(.56,.5,.1,M.bronze,0,.73,0,8);
 for(let k=0;k<4;k++){const a=k*Math.PI/2,px=Math.cos(a)*.3,pz=Math.sin(a)*.3;B.add(new THREE.CapsuleGeometry(.075,.9,4,8),M.bronze,px,1.3,pz);B.add(new THREE.SphereGeometry(.07,8,6),M.bronze,px,1.88,pz);B.cyl(.09,.06,.18,M.bronze,px,2.02,pz,8);}
 B.cyl(.08,.08,1.4,M.bronze,0,1.45,0,8);B.cyl(.55,.42,.12,M.bronze,0,2.18,0,8);B.add(new THREE.SphereGeometry(.42,12,6,0,Math.PI*2,0,Math.PI/2),M.bronze,0,2.24,0);B.add(FINIAL,M.bronze,0,2.62,0,0,0,0,1.4,1.4,1.4);B.pop();
 obstacles.push({x,z,w:1.4,d:1.4,h:2.8,label:'Fountain impact'});}
function morris(B,M,x,z,obstacles){B.push(x,0,z);B.cyl(.72,.78,.45,M.bronze,0,.22,0,16);B.cyl(.62,.62,.12,M.bronze,0,.5,0,16);const g=new THREE.CylinderGeometry(.6,.6,2.4,24,1,true);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*2);B.add(g,M.poster,0,1.76,0,0,0,0,1,1,1,true);
 B.cyl(.66,.62,.18,M.bronze,0,3.05,0,16);B.cyl(.74,.7,.12,M.bronze,0,3.2,0,16);B.add(new THREE.SphereGeometry(.62,16,8,0,Math.PI*2,0,Math.PI/2),M.bronze,0,3.26,0,0,0,0,1,.8,1);B.add(FINIAL,M.bronze,0,3.74,0,0,0,0,1.6,1.6,1.6);B.pop();
 obstacles.push({x,z,w:1.5,d:1.5,h:4,label:'Column impact'});}
function bin(B,M,x,z){B.cyl(.025,.025,1.05,M.iron,x,.52,z,6);B.add(new THREE.TorusGeometry(.2,.015,6,16),M.iron,x,1,z+.22,Math.PI/2);B.cyl(.19,.16,.6,M.bag,x,.66,z+.22,12);}
// Café terrace: scanned bistro sets, potted plants at the ends and planter boxes along the kerb.
function terrace(B,M,x0,x1,z,obstacles){if(MODELS.outdoor_table_chair_set_01){for(let x=x0;x<=x1;x+=2.3){placeModel(B,MODELS.outdoor_table_chair_set_01,x,0,z,Math.PI/2+(rand()-.5)*.25);obstacles.push({x,z,w:1.9,d:.9,h:.8,label:'Café table impact'});}
  for(const x of [x0-1.4,x1+1.4])placeModel(B,MODELS.potted_plant_02,x,0,z,rand()*6,1.1);for(let x=x0;x<=x1;x+=1.15)placeModel(B,MODELS.planter_box_01,x,0,z-.95,0,1);obstacles.push({x:(x0+x1)/2,z:z-.95,w:x1-x0+1,d:.45,h:.45,label:'Planter impact'});return;}for(let x=x0;x<=x1;x+=1.9){B.cyl(.3,.3,.03,M.marble,x,.73,z,20);B.cyl(.025,.025,.7,M.iron,x,.36,z,6);B.cyl(.2,.24,.03,M.iron,x,.015,z,10);
  for(const s of [-1,1]){const cx=x+s*.55,ry=s>0?-Math.PI/2:Math.PI/2;B.push(cx,0,z,ry);for(const [lx,lz] of [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]])B.cyl(.012,.012,.45,M.rattan,lx,.225,lz,5);B.cyl(.22,.22,.035,M.weave,0,.46,0,14);B.add(new THREE.TorusGeometry(.21,.02,5,14,Math.PI),M.rattan,0,.82,-.02,-.25,0,0);for(const s2 of [-.18,.18])B.cyl(.012,.012,.36,M.rattan,s2,.64,-.16,5,-.25);B.pop();}
  obstacles.push({x,z,w:1.6,d:.9,h:.8,label:'Café table impact'});}
 B.cyl(.03,.03,2.4,M.iron,(x0+x1)/2,1.2,z,6);B.add(new THREE.ConeGeometry(1.7,.6,8,1,true),M.parasol,(x0+x1)/2,2.35,z);}

// Traffic signal: grey-green pole, three-lamp head facing traffic, pedestrian head facing the crossing.
function signal(B,M,x,z,face,cross,carGreen){B.cyl(.055,.065,3.1,M.pole,x,1.55,z,10);B.push(x,0,z,face);B.box(.28,.78,.2,M.signalBox,0,2.85,.12);B.box(.32,.82,.03,M.signalBox,0,2.85,.005);
 for(const [i,on] of [[0,!carGreen],[1,false],[2,carGreen]]){const lit=on?[M.red,M.amber,M.green][i]:M.lampOff;B.cyl(.085,.085,.03,lit,0,3.09-i*.24,.23,14,Math.PI/2);B.box(.2,.03,.1,M.signalBox,0,3.18-i*.24,.27,0,-.35);}B.pop();
 B.push(x,0,z,cross);B.box(.22,.4,.16,M.signalBox,0,2.05,.1);B.box(.14,.13,.02,carGreen?M.walkRed:M.lampOff,0,2.15,.185);B.box(.14,.13,.02,carGreen?M.lampOff:M.walkGreen,0,1.97,.185);B.pop();}
// Art nouveau metro entrance: green cast-iron balustrade round a stair well, two lily-stem lamps and the enamel sign.
function metro(B,M,x,z,obstacles){B.push(x,0,z);const L=5.6,Wd=2.4;B.add(new THREE.PlaneGeometry(L-.2,Wd-.2),M.well,0,.004,0,-Math.PI/2);
 for(let i=0;i<9;i++)B.box(L-.3,.02,.05,M.step,0,.006,-Wd/2+.25+i*.24);
 const rail=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),g=new THREE.PlaneGeometry(len,.9);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,uv.getX(i)*len/1.05);B.add(g,M.metroRail,(x0+x1)/2,.55,(z0+z1)/2,0,-Math.atan2(z1-z0,x1-x0),0,1,1,1,true);B.box(len,.05,.06,M.metroIron,(x0+x1)/2,1.02,(z0+z1)/2,-Math.atan2(z1-z0,x1-x0));};
 rail(-L/2,-Wd/2,L/2,-Wd/2);rail(-L/2,Wd/2,L/2,Wd/2);rail(-L/2,-Wd/2,-L/2,Wd/2);
 for(const [px,pz] of [[-L/2,-Wd/2],[L/2,-Wd/2],[-L/2,Wd/2],[L/2,Wd/2]])B.cyl(.06,.08,1.15,M.metroIron,px,.57,pz,8);
 for(const s of [-1,1]){const base=new THREE.Vector3(L/2,0,s*.95);const pts=[base,new THREE.Vector3(L/2+.05,1.4,s*.95),new THREE.Vector3(L/2+.15,2.6,s*.85),new THREE.Vector3(L/2+.05,3.35,s*.62),new THREE.Vector3(L/2-.12,3.6,s*.42)];B.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.055,8),M.metroIron,0,0,0,0,0,0,1,1,1,true);
  B.add(new THREE.SphereGeometry(.15,16,12),M.metroLamp,L/2-.2,3.62,s*.38,0,0,0,1,1.35,1);}
 B.box(.08,.5,1.05,M.metroIron,L/2-.12,3.1,0);B.add(new THREE.PlaneGeometry(.95,.36),M.metroSign,L/2-.07,3.1,0,0,Math.PI/2,0);B.add(new THREE.PlaneGeometry(.95,.36),M.metroSign,L/2-.17,3.1,0,0,-Math.PI/2,0);B.pop();
 obstacles.push({x,z,w:L+.3,d:Wd+.3,h:1.1,label:'Metro railing impact'});}
function metroSignTexture(){const c=document.createElement('canvas');c.width=512;c.height=192;const g=c.getContext('2d');g.fillStyle='#e8d98a';g.fillRect(0,0,512,192);g.strokeStyle='#2c3f2a';g.lineWidth=10;g.strokeRect(6,6,500,180);g.fillStyle='#2c3f2a';g.font='italic 700 54px "Didot","Georgia",serif';g.textAlign='center';g.textBaseline='middle';g.save();g.translate(256,98);g.scale(.88,1.25);g.fillText('METROPOLITAIN',0,0);g.restore();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function stairTexture(){const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');const grd=g.createLinearGradient(0,0,0,256);grd.addColorStop(0,'#2a2a28');grd.addColorStop(1,'#030303');g.fillStyle=grd;g.fillRect(0,0,64,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

export function furnish(scene,obstacles,models={}){MODELS=models;const M=materials(),B=new Builder();
 Object.assign(M,{pole:new THREE.MeshStandardMaterial({color:'#3e4744',roughness:.45,metalness:.5}),signalBox:new THREE.MeshStandardMaterial({color:'#141515',roughness:.5,metalness:.3}),lampOff:new THREE.MeshStandardMaterial({color:'#1c1d1c',roughness:.2}),
  red:new THREE.MeshStandardMaterial({color:'#400',emissive:'#ff2410',emissiveIntensity:3}),amber:new THREE.MeshStandardMaterial({color:'#430',emissive:'#ffa020',emissiveIntensity:3}),green:new THREE.MeshStandardMaterial({color:'#032',emissive:'#20ff9a',emissiveIntensity:2.6}),
  walkRed:new THREE.MeshStandardMaterial({color:'#300',emissive:'#ff2a10',emissiveIntensity:2}),walkGreen:new THREE.MeshStandardMaterial({color:'#020',emissive:'#30ff80',emissiveIntensity:2}),
  metroIron:new THREE.MeshStandardMaterial({color:'#2f4a33',roughness:.42,metalness:.55}),metroRail:new THREE.MeshStandardMaterial({color:'#2f4a33',roughness:.45,metalness:.5,alphaMap:railingTexture(),alphaTest:.5,side:THREE.DoubleSide}),
  metroLamp:new THREE.MeshStandardMaterial({color:'#802010',emissive:'#ff5a20',emissiveIntensity:2.2,roughness:.3}),metroSign:new THREE.MeshStandardMaterial({map:metroSignTexture(),roughness:.35}),
  well:new THREE.MeshStandardMaterial({map:stairTexture(),roughness:.9,polygonOffset:true,polygonOffsetFactor:-2}),step:new THREE.MeshStandardMaterial({color:'#8f8a80',roughness:.8})});
 [M.red,M.amber,M.green,M.walkRed,M.walkGreen,M.metroLamp].forEach(m=>m.userData.castShadow=false);M.well.userData.ground=true;
 // Signals at each zebra crossing: one per kerb, heads facing oncoming traffic, cars on green.
 for(const s of [-1,1])for(const cx of [-66,0,66]){if(s<0&&cx===0)continue;for(const [kz,face] of [[s*64.35,s>0?Math.PI/2:-Math.PI/2],[s*79.65,s>0?-Math.PI/2:Math.PI/2]]){// Right-hand traffic: each head sits upstream of the crossing; walk signals face across the road.
  const sx=cx+(face>0?2.6:-2.6);signal(B,M,sx,kz,face,(kz>0)===(Math.abs(kz)<70)?0:Math.PI,true);obstacles.push({x:sx,z:kz,w:.25,d:.25,h:3.4,label:'Traffic light impact'});}}
 metro(B,M,-12,58.4,obstacles);
 for(const s of [-1,1]){for(let z=-54;z<=54;z+=18)lamp(B,M,s*71.5,z,obstacles);for(let x=-120;x<=120;x+=24){if(s<0&&Math.abs(x)<30)continue;if([-66,0,66].some(c=>Math.abs(x-c)<4))continue;lamp(B,M,x,s*83.6,obstacles);}
  // No lamp posts in front of the zebra crossings.
  for(let x=-48;x<=48;x+=24){if([-66,0,66].some(c=>Math.abs(x-c)<4))continue;lamp(B,M,x,s*63.4,obstacles);}
  for(let z=-45;z<=45;z+=18)bench(B,M,s*62.6,z,s>0?-Math.PI/2:Math.PI/2,obstacles);
  for(let z=-45;z<=45;z+=36)bin(B,M,s*62.4,z+2.5);
  // Bollards keep the outer pavements, with gaps at crossings and doors.
  for(let x=-125;x<=125;x+=1.75){if([-66,0,66].some(c=>Math.abs(x-c)<2.6))continue;if(s<0&&Math.abs(x)<29)continue;B.add(BOLLARD,M.brown,x,0,s*80.15);obstacles.push({x,z:s*80.15,w:.16,d:.16,h:.95,label:'Bollard impact'});}}
 for(let x=-22;x<=22;x+=11)lamp(B,M,x,-102.6,obstacles);
 // Lamps across the middle of the square, beside the walking routes so the paths are lit at night:
 // a ring of four round the fountain, the two central walks, the north walk and a pair by the start.
 // Each spot keeps clear of the ramps, the kids' pitch, the café and the line ahead of the spawn.
 for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])lamp(B,M,-35+dx*6.6,4+dz*6.6,obstacles);
 for(const z of [-10,4,18,32])lamp(B,M,-24.5,z,obstacles);
 for(const z of [-10,4,18,50])lamp(B,M,24.5,z,obstacles);
 for(const x of [-36,-20,-4,12])lamp(B,M,x,-49.6,obstacles);
 for(const x of [-9,9])lamp(B,M,x,26,obstacles);
 wallace(B,M,-71.5,9,obstacles);morris(B,M,71.5,-27,obstacles);
 terrace(B,M,-20,-9,82.9,obstacles);terrace(B,M,26,34,82.9,obstacles);
 return B.build(scene);}
