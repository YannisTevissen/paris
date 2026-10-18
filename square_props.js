import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {groundHeight} from './street.js';
// More life in the middle of the square: a Belle Époque carousel turning with rising and falling
// horses and bulbs, a crêpe stand with café tables under parasols, a Vélib' bike station and a few
// abandoned e-scooters. All collide; the carousel animates.
const C={x:30,z:2,r:5};
function stripes(a,b,n=12,w=256,h=64){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');for(let i=0;i<n;i++){g.fillStyle=i%2?b:a;g.fillRect(i*w/n,0,w/n+1,h);}
 g.fillStyle='rgba(0,0,0,.18)';for(let i=0;i<n;i++){g.beginPath();g.arc((i+.5)*w/n,h,w/n/2,Math.PI,0);g.fill();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;return t;}
export function buildSquareProps(scene,obstacles){
 const B=new Builder();const y0=x=>groundHeight(x[0],x[1]);
 const M={cream:new THREE.MeshStandardMaterial({color:'#efe6cf',roughness:.5}),gold:new THREE.MeshStandardMaterial({color:'#c9a24e',roughness:.3,metalness:1}),brass:new THREE.MeshStandardMaterial({color:'#d8b45c',roughness:.2,metalness:1}),
  wood:new THREE.MeshStandardMaterial({color:'#6b4a33',roughness:.7}),red:new THREE.MeshStandardMaterial({color:'#8c1d22',roughness:.45}),mirror:new THREE.MeshStandardMaterial({color:'#cfd6da',roughness:.05,metalness:1}),
  bulb:new THREE.MeshStandardMaterial({color:'#fff2c8',emissive:'#ffcf7a',emissiveIntensity:2.2}),canopy:new THREE.MeshStandardMaterial({map:stripes('#efe4cf','#9b2228',24,512,64),roughness:.7,side:THREE.DoubleSide}),
  steel:new THREE.MeshStandardMaterial({color:'#2b2f31',roughness:.45,metalness:.7}),velib:new THREE.MeshStandardMaterial({color:'#8d9b94',roughness:.45,metalness:.3}),tyre:new THREE.MeshStandardMaterial({color:'#18191a',roughness:.85}),
  green:new THREE.MeshStandardMaterial({color:'#0f3b2e',roughness:.4}),lime:new THREE.MeshStandardMaterial({color:'#5adc6e',emissive:'#2fd060',emissiveIntensity:1.4}),awning:new THREE.MeshStandardMaterial({map:stripes('#1f4d3c','#f1ead9',10),roughness:.75,side:THREE.DoubleSide}),
  parasol:new THREE.MeshStandardMaterial({color:'#e9e1cc',roughness:.8,side:THREE.DoubleSide}),scoot:new THREE.MeshStandardMaterial({color:'#1d1f20',roughness:.4,metalness:.4}),scootDeck:new THREE.MeshStandardMaterial({color:'#2fbf6a',roughness:.4})};
 // Carousel: fixed base, roof and column; the deck, poles and horses turn.
 const cy=y0([C.x,C.z]);B.cyl(C.r+.2,C.r+.3,.35,M.wood,C.x,cy+.17,C.z,48);B.cyl(C.r+.35,C.r+.35,.08,M.gold,C.x,cy+.36,C.z,48);
 B.cyl(.95,.95,3.4,M.cream,C.x,cy+2.1,C.z,8);for(let k=0;k<8;k++){const a=k/8*Math.PI*2+Math.PI/8;B.box(.62,1.6,.03,M.mirror,C.x+Math.sin(a)*.93,cy+2.2,C.z+Math.cos(a)*.93,a);}
 B.add(new THREE.ConeGeometry(C.r+.6,1.7,48,1,true),M.canopy,C.x,cy+4.75,C.z);B.add(new THREE.CylinderGeometry(C.r+.6,C.r+.6,.5,48,1,true),M.canopy,C.x,cy+3.65,C.z);B.cyl(.12,.25,.9,M.gold,C.x,cy+5.9,C.z,12);
 const bulbs=new THREE.SphereGeometry(.06,8,6);for(let k=0;k<48;k++){const a=k/48*Math.PI*2;B.add(bulbs,M.bulb,C.x+Math.sin(a)*(C.r+.62),cy+3.42,C.z+Math.cos(a)*(C.r+.62));}
 obstacles.push({x:C.x,z:C.z,w:10.6,d:10.6,h:3.5,label:'Carousel'});
 const spin=new THREE.Group();spin.position.set(C.x,cy+.36,C.z);scene.add(spin);const SB=new Builder();const horses=[];
 SB.cyl(C.r,C.r,.12,M.wood,0,.06,0,48);
 const horse=(a,rad,hgt)=>{const g=new THREE.Group();const bodyG=new THREE.CapsuleGeometry(.17,.55,6,10).rotateZ(Math.PI/2);const mk=(geo,m,x,y,z,rx=0,rz=0)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.set(rx,0,rz);o.castShadow=true;g.add(o);return o;};
  mk(bodyG,M.cream,0,0,0);mk(new THREE.BoxGeometry(.14,.36,.14),M.cream,.38,.2,0,0,-.5);mk(new THREE.BoxGeometry(.28,.13,.14),M.cream,.53,.36,0);mk(new THREE.BoxGeometry(.06,.24,.05),M.red,.35,.35,0,0,-.5);
  for(const [lx,lz,r] of [[.25,.08,.6],[.25,-.08,-.3],[-.28,.08,-.5],[-.28,-.08,.4]])mk(new THREE.CylinderGeometry(.035,.03,.42,6),M.cream,lx,-.3,lz,0,r);
  mk(new THREE.BoxGeometry(.3,.05,.32),M.red,0,.18,0);mk(new THREE.CylinderGeometry(.02,.02,3.3,8),M.brass,0,1.2,0);
  g.position.set(Math.sin(a)*rad,1+hgt,Math.cos(a)*rad);g.rotation.y=a+Math.PI/2;g.traverse(o=>o.userData.static=true);spin.add(g);horses.push({g,a,base:1+hgt});};
 for(let k=0;k<12;k++)horse(k/12*Math.PI*2,3.9,0);for(let k=0;k<8;k++)horse(k/8*Math.PI*2+.2,2.5,.15);
 SB.build(spin).forEach(m=>{m.castShadow=m.receiveShadow=true;m.userData.static=true;});spin.userData.static=true;
 // Crêpe stand with café tables.
 const S={x:-30,z:52};const sy=y0([S.x,S.z]);B.box(3.2,2.2,2,M.green,S.x,sy+1.1,S.z);B.box(3.4,.08,2.2,M.cream,S.x,sy+1.05,S.z+.15);B.box(3.0,.9,.06,M.cream,S.x,sy+1.75,S.z+1.02);
 const aw=new THREE.PlaneGeometry(3.6,1.1);B.add(aw,M.awning,S.x,sy+2.45,S.z+1.45,-1.05,0,0);B.box(3.4,.4,.06,M.green,S.x,sy+2.5,S.z-1.02);obstacles.push({x:S.x,z:S.z,w:3.4,d:2.4,h:2.5,label:'Stand'});
 for(const [tx,tz] of [[-34,47],[-30,46.5],[-26,47.5],[-33,43],[-27.5,43.2]]){const ty=y0([tx,tz]);B.cyl(.025,.025,2.3,M.steel,tx,ty+1.15,tz+.9,6);B.add(new THREE.ConeGeometry(1.35,.45,10,1,true),M.parasol,tx,ty+2.25,tz+.9);}
 // Vélib' station: docks with grey-green bikes.
 const bikeTorus=new THREE.TorusGeometry(.33,.03,8,24).rotateY(Math.PI/2);
 for(let i=0;i<10;i++){const bx=-11+i*1.1,bz=58.5,by=y0([bx,bz]);B.box(.16,.95,.22,M.velib,bx,by+.47,bz-.9);B.box(.1,.06,.03,M.lime,bx,by+.85,bz-.79);}
 obstacles.push({x:-6,z:57.6,w:11.5,d:.4,h:1.1,label:'Velib station'});
 B.build(scene).forEach(m=>{m.castShadow=m.receiveShadow=true;});
 return (dt,now)=>{spin.rotation.y+=dt*.32;for(const h of horses)h.g.position.y=h.base+Math.sin(now*1.6+h.a*3)*.18;};}
