import * as THREE from './vendor/three.module.js';
import {Builder} from './builder.js';
import {surface,zincMaps,railingTexture,signAtlas,stripeAtlas,decalTexture,farFacadeTexture,parkTexture,latticeTexture,SHOPS} from './materials.js';
import {glassMaterial,roomAttributes} from './glass.js';
import {buildStreets,groundHeight,buildEsplanade} from './street.js';
// Trocadéro-style square: stone esplanade, gravel promenades, avenues, continuous Haussmann
// street walls, and a terrace that opens onto the river valley and a full-scale tower.
let seed=20261017;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const pick=a=>a[Math.floor(rand()*a.length)];
const WALL=.42;

function plane(w,h,u0=0,u1=1,v0=0,v1=1,sx=1,sy=1){const g=new THREE.PlaneGeometry(w,h,sx,sy);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));return g;}
// Polygon helper that flips winding until the face points along the hint.
function face(B,material,points,hint){const [a,b,c]=points.map(p=>new THREE.Vector3(...p));const n=b.clone().sub(a).cross(c.clone().sub(a));if(n.dot(new THREE.Vector3(...hint))<0)points=[...points].reverse();return B.poly(material,points);}

// Paris street-name plaques: blue enamel, green frame, white lettering, arrondissement on top.
const STREETS=[['PLACE DU','TROCADÉRO'],['AVENUE','KLÉBER'],['AVENUE',"D'EYLAU"],['AVENUE','PAUL DOUMER'],['RUE','BENJAMIN FRANKLIN'],['AVENUE DU','PRÉSIDENT WILSON'],['AVENUE','GEORGES MANDEL'],['RUE','DE LUBECK']];
function plaqueTexture(){const c=document.createElement('canvas'),rows=STREETS.length;c.width=512;c.height=rows*212;const g=c.getContext('2d');STREETS.forEach(([a,b],i)=>{const y=i*212;g.fillStyle='#2b6b4c';g.fillRect(0,y,512,212);g.fillStyle='#1d3f7c';g.fillRect(12,y+12,488,188);g.strokeStyle='#f4f2ea';g.lineWidth=4;g.strokeRect(22,y+22,468,168);
 g.fillStyle='#f4f2ea';g.textAlign='center';g.textBaseline='middle';g.font='600 26px "Avenir Next Condensed","Arial Narrow",Arial,sans-serif';g.fillText('16e Arrt',256,y+46);g.font='600 34px "Avenir Next Condensed","Arial Narrow",Arial,sans-serif';g.fillText(a,256,y+92);g.font='700 46px "Avenir Next Condensed","Arial Narrow",Arial,sans-serif';const w=g.measureText(b).width;g.save();g.translate(256,y+146);if(w>440)g.scale(440/w,1);g.fillText(b,0,0);g.restore();});
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return {texture:t,rows};}
let plaqueIndex=0;
function materials(){
 const stone=['#f6ead3','#ecdfc6','#f1e5cf','#e8dbc2','#f3e3c8'].map(c=>{const m=surface('limestone',[1,1],{tileSize:5.5});m.color.set(c);return m;});
 const trim=surface('limestone',[1,1],{tileSize:3,macro:.05,grime:1,streaks:.08});trim.color.set('#f4ead8');trim.normalScale.set(.3,.3);
 const plaster=surface('concrete',[1,1],{tileSize:6,macro:.14,grime:1.4,streaks:.12});plaster.color.set('#e6d6bc');
 const chimney=surface('concrete',[1,1],{tileSize:3,macro:.2,grime:.5});chimney.color.set('#dcbf9c');
 const slate=surface('slate',[1,1],{macro:.08});slate.color.set('#c7ccd2');
 const z=zincMaps();const zinc=new THREE.MeshStandardMaterial({map:z.map,bumpMap:z.bumpMap,bumpScale:2,color:'#c3cace',roughness:.4,metalness:.6});
 const iron=new THREE.MeshStandardMaterial({color:'#1c1e1d',roughness:.42,metalness:.55});
 const railing=new THREE.MeshStandardMaterial({color:'#1a1c1b',roughness:.45,metalness:.5,alphaMap:railingTexture(),alphaTest:.5,side:THREE.DoubleSide});
 const frame=new THREE.MeshStandardMaterial({color:'#ece7dc',roughness:.48});
 const paints=['#1d3a2b','#41191f','#16263b','#1e1e1e','#4b3a1f','#2d4d4a'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.33,metalness:.05}));
 const doors=['#1b3127','#1d2b40','#3a281b','#252525','#3d1c1c'].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.4}));
 const brass=new THREE.MeshStandardMaterial({color:'#b48a45',roughness:.3,metalness:1});
 const enamel=new THREE.MeshStandardMaterial({color:'#1f3f8f',roughness:.25});
 const signs=new THREE.MeshStandardMaterial({map:signAtlas().texture,roughness:.42});const plaques=plaqueTexture();const plaque=new THREE.MeshPhysicalMaterial({map:plaques.texture,roughness:.12,clearcoat:1});plaque.userData.rows=plaques.rows;
 const awning=new THREE.MeshStandardMaterial({map:stripeAtlas(),roughness:.85,side:THREE.DoubleSide});
 const terracotta=new THREE.MeshStandardMaterial({color:'#a65a3c',roughness:.85});
 const esplanade=surface('concrete',[1,1],{tileSize:2.6,macro:.12,grime:.7,wet:.18,reflect:true,noTile:false});esplanade.color.setRGB(1.32,1.2,1.02);
 const asphalt=surface('asphalt',[1,1],{tileSize:3.2,macro:.25,wet:.38,reflect:true});
 const sidewalk=surface('asphalt',[1,1],{tileSize:2.2,macro:.3,wet:.2,reflect:true});sidewalk.color.set('#c5c2ba');
 const cobble=surface('cobble',[1,1],{wet:.6,reflect:true});
 const granite=surface('granite',[1,1],{tileSize:1.1});granite.color.set('#d6d2c9');
 const gravel=surface('gravel',[1,1],{macro:.22});gravel.color.setRGB(2.3,2.12,1.85);gravel.roughness=1;
 const paint=new THREE.MeshStandardMaterial({map:decalTexture('paint'),transparent:true,depthWrite:false,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 const decal=k=>new THREE.MeshStandardMaterial({map:decalTexture(k),transparent:true,depthWrite:false,roughness:k==='stain'?.4:.7,metalness:k==='manhole'||k==='drain'?.5:0,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
 const stains=decal('stain'),manhole=decal('manhole'),drain=decal('drain');
 [paint,stains,manhole,drain,railing].forEach(m=>{m.userData.castShadow=m===railing;});
 // Ground-level surfaces stay out of the mirrored render.
 [esplanade,asphalt,sidewalk,cobble,granite,gravel,paint,stains,manhole,drain].forEach(m=>m.userData.ground=true);
 return {plaque,stone,trim,plaster,chimney,slate,zinc,iron,railing,frame,paints,doors,brass,enamel,signs,awning,terracotta,esplanade,asphalt,sidewalk,cobble,granite,gravel,paint,stains,manhole,drain,glass:glassMaterial()};
}

// Ground surfaces all sit at y=0, split into non-overlapping strips.
function ground(B,M){
 const P=(m,x0,x1,z0,z1,y=0)=>B.add(new THREE.PlaneGeometry(1,1),m,(x0+x1)/2,y,(z0+z1)/2,-Math.PI/2,0,0,x1-x0,z1-z0,1);
 buildEsplanade(B,M.esplanade);
 for(const s of [-1,1]){const xs=[s*60,s*80.5].sort((a,b)=>a-b);P(M.gravel,xs[0],xs[1],-64.2,64.2);const cs=[s*80.5,s*80.8].sort((a,b)=>a-b);P(M.granite,cs[0],cs[1],-64.2,64.2,.002);const ws=[s*80.8,s*84].sort((a,b)=>a-b);P(M.sidewalk,ws[0],ws[1],-64.2,64.2);
  const z=v=>s*v;const zr=(a,b)=>[z(a),z(b)].sort((p,q)=>p-q);
    if(s>0)P(M.sidewalk,-127,127,79.8,85);else{P(M.sidewalk,-127,-28,-85,-79.8);P(M.sidewalk,28,127,-85,-79.8);}
  const ex=[s*84,s*127].sort((a,b)=>a-b);P(M.sidewalk,ex[0],ex[1],-64.2,64.2);}
 {// Terrace paving shares the square's stone material, so it carries the same colour and UV attributes.
  const g=new THREE.PlaneGeometry(56,24.2,8,4).rotateX(-Math.PI/2).translate(0,0,-91.9),p=g.attributes.position,c=[],u=[];for(let i=0;i<p.count;i++){c.push(.95,.94,.92);u.push(p.getX(i)/2.6,p.getZ(i)/2.6);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(u,2));B.add(g,M.esplanade,0,0,0,0,0,0,1,1,1,true);}
 buildStreets(B,M);
 // Road paint: centre dashes, zebra crossings, gutter drains, manholes and old stains.
 // Decals follow the road camber and the gutters.
 const D=(m,x,z,w,d,ry=0,u=1,v=1)=>{const g=B.add(plane(w,d,0,u,0,v,Math.ceil(w/.6),Math.ceil(d/.6)),m,x,0,z,-Math.PI/2,0,ry,1,1,1,true);const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,groundHeight(p.getX(i),p.getZ(i))+.006);return g;};
 for(const s of [-1,1]){for(let x=-124;x<124;x+=13)if(Math.abs(x)>8||s>0)D(M.paint,x,s*72,3,.14,0,1.5,.07);
  for(const cx of [-66,0,66])for(let z=66;z<78.5;z+=1.05)D(M.paint,cx,s*z,4,.5,0,2,.25);
  for(let x=-120;x<124;x+=21){D(M.drain,x,s*64.8,.95,.42);D(M.drain,x+9,s*79.2,.95,.42);}
  for(let i=0;i<14;i++)D(M.stains,-120+rand()*240,s*(66+rand()*12),2+rand()*3,2+rand()*3,rand()*3);
  for(let i=0;i<5;i++)D(M.manhole,-110+rand()*220,s*(67+rand()*10),.8,.8,rand()*6);}
 for(const [x,z] of [[-40,-30],[38,-8],[-8,46],[24,52],[-52,8],[52,-50],[-24,-58]])D(M.manhole,x,z,.8,.8,rand()*6);
 for(let i=0;i<10;i++)D(M.stains,-55+rand()*110,-58+rand()*116,1.5+rand()*2.5,1.5+rand()*2.5,rand()*3);
}

function spec(W,opts={}){const floors=opts.floors??(rand()<.4?6:5);const heights=[4.35+rand()*.35,3.55,3.25,3.05,3,2.9,2.8].slice(0,floors+1);const levels=[0];for(let i=0;i<heights.length;i++)levels.push(levels[i]+heights[i]);const top=levels[levels.length-1];
 return {floors,heights,levels,top,cornice:top+.75,balcony:new Set([2,floors]),stone:opts.stone,paint:opts.paint,door:opts.door,shops:opts.shops??true,roof:rand()<.6?'slate':'zinc',dormerEvery:rand()<.5?1:2,seed:rand()*1000,awnings:rand()<.55};}

// Facade wall with real openings: horizontal strips split at every opening edge.
function wallWithHoles(B,material,x0,x1,y0,y1,z0,z1,holes){const ys=[...new Set([y0,y1,...holes.flatMap(h=>[h.y0,h.y1])])].filter(y=>y>=y0&&y<=y1).sort((a,b)=>a-b);for(let i=0;i<ys.length-1;i++){const a=ys[i],b=ys[i+1];if(b-a<.001)continue;const active=holes.filter(h=>h.y0<=a+1e-4&&h.y1>=b-1e-4).sort((p,q)=>p.x0-q.x0);let cur=x0;for(const h of active){if(h.x0>cur)B.span(cur,h.x0,a,b,z0,z1,material);cur=Math.max(cur,h.x1);}if(cur<x1)B.span(cur,x1,a,b,z0,z1,material);}}
function solid(x0,x1,ya,yb,holes){const active=holes.filter(h=>h.y0<yb&&h.y1>ya).sort((p,q)=>p.x0-q.x0);const out=[];let cur=x0;for(const h of active){if(h.x0>cur)out.push([cur,h.x0]);cur=Math.max(cur,h.x1);}if(cur<x1)out.push([cur,x1]);return out;}
function pane(B,M,x0,x1,y0,y1,z,room){const g=plane(x1-x0,y1-y0);roomAttributes(g,room.slice(0,4),room.slice(4));B.add(g,M.glass,(x0+x1)/2,(y0+y1)/2,z,0,0,0,1,1,1,true);}
function railingPanel(B,M,x0,x1,y0,h,z){const w=x1-x0;B.add(plane(w,h,0,w/1.05,0,1),M.railing,(x0+x1)/2,y0+h/2,z,0,0,0,1,1,1,true);B.span(x0,x1,y0+h-.02,y0+h+.035,z-.04,z+.04,M.iron);}
function window(B,M,S,x0,x1,y0,y1,room,leaves=2){const t=.065,zb=-WALL+.07,zf=zb+.075;B.span(x0,x0+t,y0,y1,zb,zf,M.frame);B.span(x1-t,x1,y0,y1,zb,zf,M.frame);B.span(x0,x1,y1-t,y1,zb,zf,M.frame);B.span(x0,x1,y0,y0+.1,zb,zf,M.frame);
 const tr=y0+(y1-y0)*.8;B.span(x0,x1,tr-.035,tr+.035,zb,zf,M.frame);if(leaves===2)B.span((x0+x1)/2-.035,(x0+x1)/2+.035,y0,tr,zb,zf,M.frame);for(const k of [1,2]){const yy=y0+.1+(tr-y0-.1)*k/3;B.span(x0,x1,yy-.016,yy+.016,zb+.01,zf-.01,M.frame);}
 pane(B,M,x0+t,x1-t,y0+.1,y1-t,zb-.005,room);}

function facade(B,M,W,S,kind){const n=Math.max(2,Math.round(W/3.05)),bw=W/n,holes=[],stone=S.stone,ground=S.heights[0];
 const bays=[...Array(n).keys()].map(b=>-W/2+(b+.5)*bw);const doorBay=kind==='front'?Math.min(n-1,Math.floor(n/2)+(rand()<.5?0:-1)):-1;
 const gtype=bays.map((_,b)=>kind==='rear'?'window':b===doorBay?'door':kind==='front'&&S.shops&&rand()<.8?'shop':kind==='side'&&S.shops&&rand()<.5?'shop':'window');
 bays.forEach((cx,b)=>{const t=gtype[b];if(t==='shop')holes.push({x0:cx-bw/2+.34,x1:cx+bw/2-.34,y0:0,y1:3.35,t,cx,b});else if(t==='door')holes.push({x0:cx-1.22,x1:cx+1.22,y0:0,y1:3.95,t,cx,b});else holes.push({x0:cx-.66,x1:cx+.66,y0:1.05,y1:3.45,t,cx,b});});
 for(let f=1;f<=S.floors;f++){const y=S.levels[f],h=S.heights[f],ww=Math.min(1.36,bw*.46);bays.forEach((cx,b)=>holes.push({x0:cx-ww/2,x1:cx+ww/2,y0:y+.12,y1:y+.12+h*(f===2?.79:.72),t:'win',f,cx,b}));}
 wallWithHoles(B,stone,-W/2,W/2,0,S.top,-WALL,0,holes);
 // Rusticated ground floor: protruding stone courses with recessed joints.
 for(let y=.42;y<ground-.3;y+=.56)for(const [a,b] of solid(-W/2,W/2,y,y+.5,holes))B.span(a,b,y,y+.5,0,.05,stone);
 for(const [a,b] of solid(-W/2,W/2,0,.42,holes))B.span(a,b,0,.42,0,.08,M.trim);
 B.span(-W/2,W/2,ground-.22,ground+.2,0,.2,M.trim);B.span(-W/2,W/2,ground+.2,ground+.3,0,.12,M.trim);
 for(let f=1;f<=S.floors;f++){const y=S.levels[f];if(S.balcony.has(f)){B.span(-W/2+.04,W/2-.04,y-.22,y,0,.98,M.trim);B.span(-W/2+.04,W/2-.04,y-.3,y-.22,0,.9,M.trim);for(let b=0;b<=n;b++){const px=Math.min(W/2-.2,Math.max(-W/2+.2,-W/2+b*bw));B.span(px-.13,px+.13,y-.62,y-.3,0,.72,M.trim);B.span(px-.1,px+.1,y-.95,y-.62,0,.36,M.trim);}railingPanel(B,M,-W/2+.08,W/2-.08,y,1,.93);for(const s of [-1,1])B.add(plane(.88,1,0,.84,0,1),M.railing,s*(W/2-.08),y+.5,.48,0,Math.PI/2,0,1,1,1,true);}else if(f>1)B.span(-W/2,W/2,y-.1,y+.06,0,.1,M.trim);}
 for(const h of holes){const room=[S.seed+h.b*13.7+(h.f||0)*101.3+(kind==='rear'?500:kind==='side'?250:0),bw,h.f?S.heights[h.f]:ground,0,(bw-(h.x1-h.x0))/2,.12,h.x1-h.x0,h.y1-h.y0];
  if(h.t==='win'){window(B,M,S,h.x0,h.x1,h.y0,h.y1,room);B.span(h.x0-.15,h.x0,h.y0,h.y1+.15,0,.05,M.trim);B.span(h.x1,h.x1+.15,h.y0,h.y1+.15,0,.05,M.trim);B.span(h.x0-.15,h.x1+.15,h.y1,h.y1+.15,0,.05,M.trim);
   if(h.f===2||h.f===3){B.span(h.x0-.32,h.x1+.32,h.y1+.22,h.y1+.36,0,.25,M.trim);B.span(h.x0-.16,h.x1+.16,h.y1+.15,h.y1+.22,0,.1,M.trim);if(h.f===2)for(const x of [h.x0-.24,h.x1+.24])B.span(x-.07,x+.07,h.y1-.12,h.y1+.22,0,.2,M.trim);}
   if(!S.balcony.has(h.f)){railingPanel(B,M,h.x0+.02,h.x1-.02,h.y0,.92,.035);B.span(h.x0-.1,h.x1+.1,h.y0-.08,h.y0,0,.12,M.trim);}}
  else if(h.t==='window'){window(B,M,S,h.x0,h.x1,h.y0,h.y1,room);railingPanel(B,M,h.x0,h.x1,h.y0,h.y1-h.y0,.02);B.span(h.x0-.08,h.x1+.08,h.y0-.1,h.y0,0,.14,M.trim);}
  else if(h.t==='shop'){const paint=S.paint,sign=Math.floor(rand()*SHOPS.length),rows=signAtlas().rows;room[3]=1;room[1]=h.x1-h.x0;room[4]=0;room[5]=0;
   B.span(h.x0-.12,h.x0+.16,0,3.98,-.12,.16,paint);B.span(h.x1-.16,h.x1+.12,0,3.98,-.12,.16,paint);B.span(h.x0-.12,h.x1+.12,3.35,3.98,-.12,.2,paint);B.span(h.x0-.12,h.x1+.12,3.98,4.06,-.12,.26,paint);
   B.add(plane(h.x1-h.x0-.3,.46,0,1,1-(sign+1)/rows,1-sign/rows),M.signs,h.cx,3.665,.205,0,0,0,1,1,1,true);
   B.span(h.x0+.16,h.x1-.16,0,.6,-.14,.04,paint);B.span(h.x0+.16,h.x1-.16,2.7,2.78,-.16,-.06,paint);const mid=h.cx+(rand()<.5?-.6:.6);B.span(mid-.05,mid+.05,.6,3.35,-.16,-.06,paint);B.span(mid+.85,mid+.95,.6,3.35,-.16,-.06,paint);B.span(h.x0+.16,h.x1-.16,1.22,1.25,-.15,-.12,M.brass);
   pane(B,M,h.x0+.16,h.x1-.16,.6,3.35,-.17,[...room.slice(0,4),.16,.6,h.x1-h.x0-.32,2.75]);
   if(S.awnings&&kind==='front'){const row=Math.floor(rand()*4),v0=1-(row+1)/4+.01,v1=1-row/4-.01,x0=h.x0-.1,x1=h.x1+.1,u=(x1-x0)/2;const g=new THREE.BufferGeometry();const p=[[x0,2.62,1.9],[x1,2.62,1.9],[x1,3.3,.22],[x0,3.3,.22]];g.setAttribute('position',new THREE.Float32BufferAttribute([...p[0],...p[1],...p[2],...p[0],...p[2],...p[3]],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,v0,u,v0,u,v1,0,v0,u,v1,0,v1],2));g.computeVertexNormals();B.add(g,M.awning,0,0,0,0,0,0,1,1,1,true);B.add(plane(x1-x0,.26,0,u,v0,v0+.05),M.awning,(x0+x1)/2,2.49,1.9,0,0,0,1,1,1,true);for(const x of [x0+.1,x1-.1])B.span(x-.02,x+.02,2.6,2.64,.2,1.88,M.iron);}}
  else if(h.t==='door'){const door=S.door;B.span(h.x0,h.x1,0,3.15,-WALL+.02,-WALL+.12,door);for(const s of [-1,1])for(const [a,b] of [[.25,1.35],[1.55,2.95]]){const x=h.cx+s*.61;B.span(x-.42,x+.42,a,b,-WALL+.12,-WALL+.16,door);B.span(x-.34,x+.34,a+.08,b-.08,-WALL+.16,-WALL+.18,door);}B.span(h.cx-.03,h.cx+.03,0,3.15,-WALL+.12,-WALL+.2,door);
   for(const s of [-1,1])B.cyl(.04,.04,.12,M.brass,h.cx+s*.2,1.5,-WALL+.22,12,Math.PI/2);pane(B,M,h.x0,h.x1,3.15,3.95,-WALL+.08,[room[0],h.x1-h.x0,1.2,0,0,0,h.x1-h.x0,.8]);railingPanel(B,M,h.x0,h.x1,3.15,.8,-WALL+.14);
   B.span(h.x0-.32,h.x0,0,4.3,0,.08,M.trim);B.span(h.x1,h.x1+.32,0,4.3,0,.08,M.trim);B.span(h.x0-.32,h.x1+.32,3.95,4.3,0,.12,M.trim);B.span(h.cx-.2,h.cx+.2,3.88,4.42,0,.2,M.trim);B.span(h.x1+.4,h.x1+.66,2.62,2.8,0,.025,M.enamel);}}
 // Main cornice: extruded moulding profile across the full width.
 const s=new THREE.Shape();s.moveTo(0,0);s.lineTo(.1,0);s.lineTo(.1,.12);s.quadraticCurveTo(.12,.24,.26,.26);s.lineTo(.28,.34);s.lineTo(.56,.36);s.lineTo(.6,.42);s.lineTo(.62,.55);s.quadraticCurveTo(.66,.66,.76,.68);s.lineTo(.76,.75);s.lineTo(0,.75);s.lineTo(0,0);
 const g=new THREE.ExtrudeGeometry(s,{depth:W,bevelEnabled:false,curveSegments:4});B.add(g,M.trim,W/2,S.top,0,0,-Math.PI/2,0,1,1,1,true);
 for(let x=-W/2+.4;x<W/2-.2;x+=.6)B.span(x-.07,x+.07,S.top+.18,S.top+.3,0,.27,M.trim);
}

function roof(B,M,W,D,S,opts){const yc=S.cornice,zf=D/2-.55,zb=-D/2+(opts.rear?.55:.15),bh=3.15,run=1.05,rh=4.4;const brisis=S.roof==='slate'?M.slate:M.zinc;
 const F=[[-W/2,yc,zf],[W/2,yc,zf],[W/2,yc+bh,zf-run],[-W/2,yc+bh,zf-run]],T=[[-W/2,yc+bh,zf-run],[W/2,yc+bh,zf-run],[W/2,yc+rh,0],[-W/2,yc+rh,0]];
 const Bk=[[W/2,yc,zb],[-W/2,yc,zb],[-W/2,yc+bh,zb+run],[W/2,yc+bh,zb+run]],Tb=[[W/2,yc+bh,zb+run],[-W/2,yc+bh,zb+run],[-W/2,yc+rh,0],[W/2,yc+rh,0]];
 B.quad(brisis,...F,4);B.quad(M.zinc,...T,4);B.quad(brisis,...Bk,4);B.quad(M.zinc,...Tb,4);
 for(const s of [-1,1])face(B,M.plaster,[[s*W/2,yc,zf],[s*W/2,yc+bh,zf-run],[s*W/2,yc+rh,0],[s*W/2,yc+bh,zb+run],[s*W/2,yc,zb]],[s,0,0]);
 B.span(-W/2,W/2,yc+rh-.06,yc+rh+.1,-.12,.12,M.zinc);B.span(-W/2,W/2,yc-.05,yc+.12,zf-.1,zf+.6,M.zinc);
 // Dormers through the steep slope, with their own glazing and zinc caps.
 const n=Math.max(2,Math.round(W/3.05)),bw=W/n;for(let b=0;b<n;b++){if(b%S.dormerEvery)continue;const cx=-W/2+(b+.5)*bw,y0=yc+.35,y1=yc+2.25,zfr=zf-.18,w=.62;
  B.span(cx-w-.16,cx-w,y0-.1,y1,zfr-1.1,zfr,M.trim);B.span(cx+w,cx+w+.16,y0-.1,y1,zfr-1.1,zfr,M.trim);B.span(cx-w-.2,cx+w+.2,y0-.22,y0,zfr-1.1,zfr+.05,M.trim);
  const g=plane(w*2,y1-y0);roomAttributes(g,[S.seed+b*7.7+900,w*2+1.6,2.6,2],[.8,.25,w*2,y1-y0]);B.add(g,M.glass,cx,(y0+y1)/2,zfr-.16,0,0,0,1,1,1,true);B.span(cx-.03,cx+.03,y0,y1,zfr-.17,zfr-.12,M.frame);B.span(cx-w,cx+w,y0+(y1-y0)*.62-.03,y0+(y1-y0)*.62+.03,zfr-.17,zfr-.12,M.frame);
  const yt=y1+.62,ze=zfr-1.25;face(B,M.zinc,[[cx-w-.3,y1,zfr+.08],[cx,yt,zfr+.08],[cx,yt,ze],[cx-w-.3,y1,ze]],[-1,1,0]);face(B,M.zinc,[[cx+w+.3,y1,zfr+.08],[cx+w+.3,y1,ze],[cx,yt,ze],[cx,yt,zfr+.08]],[1,1,0]);face(B,M.trim,[[cx-w-.2,y1,zfr+.02],[cx+w+.2,y1,zfr+.02],[cx,yt-.05,zfr+.02]],[0,0,1]);}
 // Chimney stacks on the party walls, crowned with terracotta pots.
 for(const s of [-1,1]){if(opts.noChimney===s)continue;for(const zc of [-D*.18,D*.2]){if(rand()<.25)continue;const x=s*(W/2-.45),top=yc+rh+1.4+rand()*.8;B.span(x-.38,x+.38,yc+2.4,top,zc-1.1,zc+1.1,M.chimney);B.span(x-.45,x+.45,top,top+.14,zc-1.18,zc+1.18,M.trim);const pots=3+Math.floor(rand()*4);for(let i=0;i<pots;i++){const pz=zc-.85+i*(1.7/(pots-1||1));B.cyl(.085,.11,.5+rand()*.2,M.terracotta,x,top+.4,pz,8);}}}
}

function building(B,M,obstacles,{x,z,ry,W,D,sides={},rear=false,drop=0,floors}){const S=spec(W,{stone:pick(M.stone),paint:pick(M.paints),door:pick(M.doors),floors});B.push(x,0,z,ry);
 const left=!!sides.left,right=!!sides.right;
 B.span(-W/2+(left?WALL+.02:.01),W/2-(right?WALL+.02:.01),-drop,S.cornice+.02,-D/2+(rear?WALL+.02:.01),D/2-WALL-.02,M.plaster);
 B.push(0,0,D/2);facade(B,M,W,S,'front');
 // Street-name plaque on the solid corner pier of corner buildings.
 for(const [on,sx] of [[left,-1],[right,1]]){if(!on)continue;const row=plaqueIndex++%M.plaque.userData.rows,rows=M.plaque.userData.rows;B.add(plane(.7,.29,0,1,1-(row+1)/rows,1-row/rows),M.plaque,sx*(W/2-.43),S.heights[0]+1.35,.035,0,0,0,1,1,1,true);B.span(sx*(W/2-.43)-.37,sx*(W/2-.43)+.37,S.heights[0]+1.19,S.heights[0]+1.51,0,.03,M.iron);}
 B.pop();
 const sideW=D-WALL-(rear?WALL:0),sideZ=(rear?0:-WALL/2)-0;
 if(left){B.push(-W/2,0,sideZ-(rear?0:0),-Math.PI/2);facade(B,M,sideW,S,'side');B.pop();}
 if(right){B.push(W/2,0,sideZ,Math.PI/2);facade(B,M,sideW,S,'side');B.pop();}
 if(rear){B.push(0,0,-D/2,Math.PI);facade(B,M,W,{...S,shops:false},'rear');B.pop();}
 roof(B,M,W,D,S,{rear,noChimney:left?-1:right?1:0});B.pop();
 const turned=Math.abs(Math.sin(ry))>.5;obstacles.push({x,z,w:(turned?D:W)+.4,d:(turned?W:D)+.4,h:S.cornice+5,label:'Building impact'});return S;}

function streetWalls(B,M,obstacles){
 const row=(from,to,zc,ry,extra={})=>{let x=from;const out=[];while(to-x>9){let W=14+rand()*7;if(to-x-W<12)W=to-x;out.push([x+W/2,W]);x+=W;}return out.map(([cx,W],i)=>building(B,M,obstacles,{x:cx,z:zc,ry,W,D:15,...(typeof extra==='function'?extra(i,out.length,cx):extra)}));};
 // North row (facing the square) leaves an opening for the view; buildings rise from the valley floor.
 row(-127,-28,-92.5,0,(i,n)=>({drop:28,sides:i===n-1?{right:true}:{},rear:i>=n-2}));
 row(28,127,-92.5,0,(i)=>({drop:28,sides:i===0?{left:true}:{},rear:i<=1}));
 row(-127,127,92.5,Math.PI);
 const col=(xc,ry)=>{let z=-64.2;const list=[];while(64.2-z>9){let W=15+rand()*6;if(64.2-z-W<12)W=64.2-z;list.push([z+W/2,W]);z+=W;}list.forEach(([zc,W],i)=>{const first=i===0,last=i===list.length-1;const towardsNeg=ry>0;building(B,M,obstacles,{x:xc,z:zc,ry,W,D:19,sides:{left:towardsNeg?last:first,right:towardsNeg?first:last}});});};
 col(-93.5,Math.PI/2);col(93.5,-Math.PI/2);
 for(const s of [-1,1])for(const zs of [-1,1])building(B,M,obstacles,{x:s*136.5,z:zs*75,ry:-s*Math.PI/2,W:36,D:19,floors:5});
}

// Terrace edge: stone balustrade, retaining walls and the drop to the river valley.
function terrace(B,M,obstacles){const prof=[[0,0],[.11,0],[.11,.06],[.07,.1],[.06,.2],[.1,.32],[.12,.42],[.08,.55],[.05,.62],[.07,.66],[.1,.7],[0,.7]].map(([x,y])=>new THREE.Vector2(x,y));const baluster=new THREE.LatheGeometry(prof,10);
 for(let x=-27.6;x<=27.6;x+=.27){if(Math.abs(((x+27.6)%4.6))<.3)continue;B.add(baluster,M.trim,x,.18,-104.1);}
 B.span(-28,28,0,.18,-104.45,-103.75,M.trim);B.span(-28.1,28.1,.88,1.04,-104.5,-103.7,M.trim);for(let x=-27.6;x<=27.7;x+=4.6)B.span(x-.22,x+.22,0,1.1,-104.5,-103.7,M.trim);
 B.span(-28.6,28.6,-28,0,-105.4,-104.45,M.stone[1]);for(const s of [-1,1])B.span(s*28-.5,s*28+.5,-28,1.1,-104.45,-97.4,M.trim);
 obstacles.push({x:0,z:-104.1,w:56.4,d:.8,h:40,label:'Balustrade impact'});for(const s of [-1,1])obstacles.push({x:s*28,z:-100.9,w:1,d:7,h:40,label:'Terrace wall'});}

// Valley seen from the terrace: gardens and fountain pool, the Seine and its bridge,
// the Champ de Mars, dense mansard-roofed blocks with aerial haze, and distant landmarks.
function vista(scene){const B=new Builder(),y=-28;const far=m=>{m.userData.castShadow=false;return m;};
 const urban=far(surface('asphalt',[1,1],{tileSize:7,macro:.35,wet:0}));urban.color.setRGB(1.25,1.18,1.08);
 const lawn=far(new THREE.MeshStandardMaterial({map:parkTexture(),roughness:.95}));
 // Wind ripples: a tileable height field turned into a normal map, scrolled every frame.
 const rip=document.createElement('canvas');rip.width=rip.height=256;{const g=rip.getContext('2d'),img=g.createImageData(256,256),h=(x,y)=>Math.sin(x*.049+Math.sin(y*.031)*2)*.5+Math.sin(y*.074+x*.024)*.35+Math.sin((x+y)*.098)*.15;for(let y=0;y<256;y++)for(let x=0;x<256;x++){const dx=h(x+1,y)-h(x-1,y),dy=h(x,y+1)-h(x,y-1),i=(y*256+x)*4;img.data[i]=128+dx*90;img.data[i+1]=128+dy*90;img.data[i+2]=255;img.data[i+3]=255;}g.putImageData(img,0,0);}
 const ripple=new THREE.CanvasTexture(rip);ripple.wrapS=ripple.wrapT=THREE.RepeatWrapping;ripple.repeat.set(60,3);
 const water=far(new THREE.MeshStandardMaterial({color:'#33474a',roughness:.08,metalness:.25,envMapIntensity:1.4,normalMap:ripple,normalScale:new THREE.Vector2(.35,.35)}));
 const quay=far(surface('limestone',[1,1],{tileSize:6}));quay.color.set('#ddd0b6');
 const facadeFar=far(new THREE.MeshStandardMaterial({map:farFacadeTexture(),roughness:.85,color:'#a89880'}));const chimneyFar=far(new THREE.MeshStandardMaterial({color:'#b89c80',roughness:.9}));
 const roofs=['#7d878e','#6b7378','#59616a','#8a8f8f'].map(c=>far(new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.4})));
const gold=far(new THREE.MeshStandardMaterial({color:'#d9b25a',roughness:.25,metalness:1}));const glassTower=far(new THREE.MeshStandardMaterial({color:'#262b30',roughness:.15,metalness:.6}));
 const P=(m,x0,x1,z0,z1,yy=y,rep=null)=>{const g=new THREE.PlaneGeometry(1,1);if(rep){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*(x1-x0)/rep,uv.getY(i)*(z1-z0)/rep);}B.add(g,m,(x0+x1)/2,yy,(z0+z1)/2,-Math.PI/2,0,0,x1-x0,z1-z0,1,true);};
 P(urban,-450,450,-450,-106);P(urban,-130,130,-1150,-450);
 P(lawn,-62,62,-300,-110,y+.04,120);P(lawn,-95,95,-1120,-470,y+.04,170);
 B.add(new THREE.PlaneGeometry(1,1),water,0,y+.6,-200,-Math.PI/2,0,0,40,150,1);B.span(-21,21,y,y+.7,-276,-274,quay);B.span(-21,21,y,y+.7,-126,-124,quay);for(const s of [-1,1])B.span(s*20,s*21,y,y+.7,-276,-124,quay);
 B.add(new THREE.PlaneGeometry(1,1),water,0,y-.6,-405,-Math.PI/2,0,0,1200,64,1);for(const s of [-1,1])B.span(-600,600,y-4,y+.2,-405+s*34,-405+s*32,quay);
 B.span(-17,17,y+6,y+7.6,-442,-368,quay);for(let z=-430;z<=-380;z+=16.6){B.span(-17,17,y-4,y+6,z-2.2,z+2.2,quay);}for(const s of [-1,1])B.span(s*16.6,s*17,y+7.6,y+8.6,-442,-368,quay);
 // City fabric: blocks with mansard frustum roofs, leaving the garden axis and the river open.
 const frustum=new THREE.CylinderGeometry(Math.SQRT1_2*.82,Math.SQRT1_2,1,4,1);frustum.rotateY(Math.PI/4);
 // Beyond about 700 m the photographic matte painting (matte.js) takes over: from the Trocadéro you
 // look down onto a carpet of real rooftops.
 for(let gx=-1300;gx<=1300;gx+=82)for(let gz=-150;gz>=-1300;gz-=82){if(Math.hypot(gx,gz)>450)continue;const cx=gx+(rand()-.5)*14,cz=gz+(rand()-.5)*14;if(Math.abs(cx)<95&&cz>-1560)continue;if(Math.abs(cz+405)<70)continue;if(Math.abs(cx)<130&&cz>-300)continue;
  // Each block is split into a few buildings of different heights with chimneys on top.
  const parts=2+Math.floor(rand()*3),d=58+rand()*14;let x0=cx-36;for(let k=0;k<parts;k++){const w=72/parts-1.5,h=15+rand()*14+(rand()<.08?10:0),bx=x0+w/2;x0+=w+1.5;const g=B.box(w,h,d,facadeFar,bx,y+h/2,cz);if(g){const u=g.attributes.uv;for(let q=0;q<u.count;q++)u.setXY(q,u.getX(q)*w/12,u.getY(q)*h/12);}B.add(frustum,roofs[Math.floor(rand()*roofs.length)],bx,y+h+2.6,cz,0,0,0,w,5.2,d);for(let c=0;c<3;c++)B.box(1.2,3,4,chimneyFar,bx+(rand()-.5)*w*.7,y+h+3.5,cz+(rand()-.5)*d*.6);}}
  const farTrees=[];for(let i=0;i<64;i++){const s=i%2?1:-1;if(i<28)farTrees.push({x:s*(102+rand()*4),z:-830-Math.floor(i/2)*21,y,scale:1.6,lite:true});
  // Tree-lined gardens round the tower's base and down both sides of the Champ de Mars.
  }for(let z=-475;z>=-1100;z-=17)for(const s of [-1,1])for(const off of [104,116])farTrees.push({x:s*(off+rand()*3),z:z+(rand()-.5)*5,y,scale:1.5,lite:true});for(let x=-560;x<=560;x+=26){if(Math.abs(x)<30)continue;for(const s of [-1,1])farTrees.push({x:x+(rand()-.5)*6,z:-405+s*44,y,scale:1.5,lite:true});}

 const meshes=B.build(scene,{castShadow:false});meshes.forEach(m=>{m.receiveShadow=false;m.userData.far=true;});
 tower(scene,0,y,-760);
 return {water,trees:[...farTrees,...[{x:-40,z:-140},{x:40,z:-140},{x:-40,z:-165},{x:40,z:-165},{x:-40,z:-190},{x:40,z:-190},{x:-40,z:-215},{x:40,z:-215},{x:-40,z:-240},{x:40,z:-240},{x:-40,z:-265},{x:40,z:-265},{x:-52,z:-152},{x:52,z:-152},{x:-52,z:-202},{x:52,z:-202},{x:-52,z:-252},{x:52,z:-252}].map(p=>({...p,y,scale:1.35}))]};}

// The Eiffel Tower as a real riveted lattice: four curving legs whose faces are braced with crossed
// diagonals, the first-floor arches, three platforms and a single braced shaft to the antenna, all as
// individual iron members (instanced), painted in its graded brown (darker at the foot, lighter above).
export const TOWER={};
function tower(scene,cx,cy,cz){
 const half=y=>y<57?62-31*Math.pow(y/57,.8):y<116?31-11*((y-57)/59):y<276?20-15.5*Math.pow((y-116)/160,.75):4.5;
 const legW=y=>y<57?22-9*(y/57):13-6*((y-57)/59);
 const members=[];const add=(a,b,r)=>members.push([a,b,r]);
 const P=(x,y,z)=>new THREE.Vector3(x,y,z);
 // Leg corners at height y: the outer corner follows half(y), the leg is legW(y) square.
 const legQuad=(sx,sz,y)=>{const c=half(y),w=legW(y);return [P(sx*c,y,sz*c),P(sx*(c-w),y,sz*c),P(sx*(c-w),y,sz*(c-w)),P(sx*c,y,sz*(c-w))];};
 const lv=[];for(let y=0;y<116;y+=y<57?3.4:3.8)lv.push(y);lv.push(116);
 for(const sx of [-1,1])for(const sz of [-1,1]){for(let i=0;i<lv.length-1;i++){const A=legQuad(sx,sz,lv[i]),Bq=legQuad(sx,sz,lv[i+1]);
   for(let k=0;k<4;k++){const k2=(k+1)%4;add(A[k],Bq[k],k===0?.75:.5);// corner girders
    add(A[k],Bq[k2],.16);add(A[k2],Bq[k],.16);// crossed bracing on each leg face
    if(i%2===0)add(A[k],A[k2],.2);}
   // Inner lattice web across the leg every other bay.
   if(i%2===1){add(A[0],Bq[2],.12);add(A[1],Bq[3],.12);}}}
 // Shaft from the second platform to the top: one square with braced faces.
 const sq=y=>{const c=half(y);return [P(-c,y,-c),P(c,y,-c),P(c,y,c),P(-c,y,c)];};
 const sv=[];for(let y=116;y<276;y+=4)sv.push(y);sv.push(276);
 for(let i=0;i<sv.length-1;i++){const A=sq(sv[i]),Bq=sq(sv[i+1]);for(let k=0;k<4;k++){const k2=(k+1)%4;add(A[k],Bq[k],.55);add(A[k],Bq[k2],.13);add(A[k2],Bq[k],.13);if(i%2===0)add(A[k],A[k2],.16);
   const m0=A[k].clone().lerp(A[k2],.5),m1=Bq[k].clone().lerp(Bq[k2],.5);add(m0,m1,.1);}}
 // First-floor arches between the legs.
 for(let k=0;k<4;k++){const ang=k*Math.PI/2,ca=Math.cos(ang),sa=Math.sin(ang);let prev=null;for(let i=0;i<=24;i++){const t=i/24,u=-36+72*t,y=39+Math.sqrt(Math.max(0,1-Math.pow(2*t-1,2)))*15.5;const p=P(ca*u+sa*38.5,y,-sa*u+ca*38.5);if(prev)add(prev,p,.7);prev=p;}}
 const n=members.length;const geo=new THREE.CylinderGeometry(1,1,1,5,1,true);
 const iron=new THREE.MeshStandardMaterial({roughness:.55,metalness:.45,side:THREE.DoubleSide});iron.userData.castShadow=false;
 const mesh=new THREE.InstancedMesh(geo,iron,n);const m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),c0=new THREE.Color('#2e2219'),c1=new THREE.Color('#5c4a3a'),col=new THREE.Color();
 members.forEach(([a,b,r],i)=>{const d=b.clone().sub(a),len=d.length();q.setFromUnitVectors(up,d.normalize());m.compose(a.clone().add(b).multiplyScalar(.5).add(P(cx,cy,cz)),q,new THREE.Vector3(r,len+r*.6,r));mesh.setMatrixAt(i,m);
  col.copy(c0).lerp(c1,Math.min(1,((a.y+b.y)/2)/300));mesh.setColorAt(i,col);});
 mesh.renderOrder=-1;mesh.userData.static=true;mesh.computeBoundingSphere();scene.add(mesh);
 // Lace between the members: alpha-cut lattice panels on every leg and shaft face give the tower its
 // dense, lacy read from a distance instead of a wireframe.
 const PB=new Builder();const lace=new THREE.MeshStandardMaterial({color:'#4a3a2e',roughness:.6,metalness:.4,alphaMap:latticeTexture(),alphaTest:.45,side:THREE.DoubleSide});lace.userData.castShadow=false;
 const panel=(a,b,c,d,len,wid)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d].map((v,k)=>v+[cx,cy,cz][k%3]),3));const ur=wid/6,vr=len/6;g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,ur,0,ur,vr,0,0,ur,vr,0,vr],2));g.computeVertexNormals();PB.add(g,lace,0,0,0,0,0,0,1,1,1,true);};
 for(const sx of [-1,1])for(const sz of [-1,1])for(let i=0;i<lv.length-1;i++){const A=legQuad(sx,sz,lv[i]),Bq=legQuad(sx,sz,lv[i+1]);for(let k=0;k<4;k++){const k2=(k+1)%4;panel(A[k].toArray(),A[k2].toArray(),Bq[k2].toArray(),Bq[k].toArray(),lv[i+1]-lv[i],A[k].distanceTo(A[k2]));}}
 for(let i=0;i<sv.length-1;i++){const A=sq(sv[i]),Bq=sq(sv[i+1]);for(let k=0;k<4;k++){const k2=(k+1)%4;panel(A[k].toArray(),A[k2].toArray(),Bq[k2].toArray(),Bq[k].toArray(),sv[i+1]-sv[i],A[k].distanceTo(A[k2]));}}
 PB.build(scene,{castShadow:false}).forEach(m=>{m.receiveShadow=false;m.renderOrder=-1;m.userData.towerLace=true;});
 iron.userData.tower=true;lace.userData.tower=true;iron.emissive=new THREE.Color('#ffb04a');iron.emissiveIntensity=0;lace.emissive=new THREE.Color('#ffa840');lace.emissiveIntensity=0;
 // The hourly sparkle: a few thousand twinkling lights scattered over the structure.
 const sp=[];for(let i=0;i<2600;i++){const [a,b]=members[Math.floor(Math.random()*members.length)];const t=Math.random();sp.push(cx+a.x+(b.x-a.x)*t,cy+a.y+(b.y-a.y)*t,cz+a.z+(b.z-a.z)*t);}
 const sparkle=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(sp,3)),new THREE.PointsMaterial({color:'#e8f4ff',size:1.6,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,fog:false}));
 sparkle.name='towerSparkle';sparkle.userData.static=true;sparkle.visible=false;scene.add(sparkle);TOWER.iron=iron;TOWER.lace=lace;TOWER.sparkle=sparkle;
 // Platforms, the first-floor gallery, the top cabin and the antenna.
 const B=new Builder();const deck=new THREE.MeshStandardMaterial({color:'#3a2d22',roughness:.7,metalness:.35});deck.userData.castShadow=false;const glass=new THREE.MeshStandardMaterial({color:'#4c5456',roughness:.15,metalness:.6});glass.userData.castShadow=false;
 for(const [y,c,h] of [[57,35,3],[116,21,2.4],[276,5.5,4]]){B.box(c*2,h,c*2,deck,cx,cy+y+h/2,cz);B.box(c*2+1.6,.8,c*2+1.6,deck,cx,cy+y+h+.4,cz);}
 B.box(58,4.2,58,glass,cx,cy+62.5,cz);B.box(60,.6,60,deck,cx,cy+64.9,cz);B.box(34,3.4,34,glass,cx,cy+120.2,cz);
 B.cyl(2.6,3.2,12,deck,cx,cy+286,cz,8);B.cyl(1.2,1.8,6,glass,cx,cy+295,cz,8);B.cyl(.35,.8,26,deck,cx,cy+311,cz,6);
 B.build(scene,{castShadow:false}).forEach(mm=>{mm.receiveShadow=false;mm.renderOrder=-1;});}

export const buildVista=scene=>vista(scene);
export function buildCity(scene,{vista:withVista=true}={}){const M=materials();const B=new Builder();const obstacles=[];
 ground(B,M);streetWalls(B,M,obstacles);terrace(B,M,obstacles);
 const meshes=B.build(scene);const valley=withVista?vista(scene):{trees:[],water:null};
 return {obstacles,materials:M,meshes,valleyTrees:valley.trees,water:valley.water};}
