import * as THREE from './vendor/three.module.js';
import {cloudUniform,applyClouds} from './atmosphere.js';
import {surface,preparePBR,worldUV,batchStatic,sunUniform} from './materials.js';
import {buildCity,buildVista} from './city.js';
import {groundHeight} from './street.js';
import {plantTrees,updateTrees} from './trees.js';
import {furnish} from './props.js';
import {buildAvatar,CHAIR} from './avatar.js';
import {parkCars,createTraffic,loadCarModels} from './cars.js';
import {createLife} from './life.js';
import {loadModels,loadGLB} from './models.js';
import {glassMaterial} from './glass.js';
import {createVehicle,jumpVehicle,stepVehicle,hurtVehicle,flipVehicle} from './physics.js';
import {RoundedBoxGeometry} from './vendor/render-addons.js';
import {Visuals} from './rendering.js';
import {buildSkatepark} from './skatepark.js';
import {buildPlaza} from './plaza.js';
import {buildMatte} from './matte.js';
import {buildSquareProps} from './square_props.js';
import {Daylight} from './daylight.js';
import {STANCE_NAMES} from './stunts.js';
import {CrashRider} from './ragdoll.js';
const $=id=>document.getElementById(id);
await preparePBR();
const scene=new THREE.Scene();scene.background=new THREE.Color('#d0cfbf');// Aerial perspective: Paris haze greys and lifts the far city like a real view from the Trocadéro.
scene.fog=new THREE.FogExp2(new THREE.Color().setRGB(.5,.46,.47),.00095);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=.86;$('world').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.15,3200);
const hemi=new THREE.HemisphereLight('#dfe9ff','#6b5f4a',.18);scene.add(hemi);// Sun carries most of the light; the sky only fills, so shadows and drifting cloud shade read.
const sun=new THREE.DirectionalLight(new THREE.Color().setRGB(1,.74,.5),5.6);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-62,right:62,top:62,bottom:-62,near:1,far:520});sun.shadow.bias=-.00012;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
const visuals=new Visuals(renderer,scene,camera);await visuals.init();
// Sun follows the HDRI azimuth; elevation is lifted to late golden hour so shadows stay readable.
const sunDir=visuals.sunDirection.clone();sunDir.y=Math.max(sunDir.y,.46);sunDir.normalize();sunUniform.value.copy(sunDir);// Updated every frame by the daylight system.
const lightRight=new THREE.Vector3(),lightUp=new THREE.Vector3(),sunTexel=124/4096;
function placeSun(p){lightRight.set(0,1,0).cross(sunDir).normalize();lightUp.copy(sunDir).cross(lightRight).normalize();const a=Math.round(p.dot(lightRight)/sunTexel)*sunTexel,b=Math.round(p.dot(lightUp)/sunTexel)*sunTexel,c=p.dot(sunDir);sun.target.position.copy(lightRight).multiplyScalar(a).addScaledVector(lightUp,b).addScaledVector(sunDir,c);sun.position.copy(sun.target.position).addScaledVector(sunDir,260);sun.target.updateMatrixWorld();}
const matCache=new Map();const mat=(color,roughness=.8,metalness=0)=>{const key=color+'/'+roughness+'/'+metalness;if(!matCache.has(key))matCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return matCache.get(key)};const concrete=surface('concrete',[3,3]),edge=mat('#ddd9c7'),dark=mat('#252f32'),steel=mat('#899799',.3,.7),lime=mat('#ddf563'),black=surface('leather'),rubber=surface('rubber',[1,1]),blue=mat('#5b605d',.55,.55);black.color.set('#202329');
function box(w,h,d,m,x=0,y=0,z=0,parent=scene){const geo=parent.userData.rounded?new RoundedBoxGeometry(w,h,d,2,Math.min(.05,w*.13,h*.13,d*.13)):new THREE.BoxGeometry(w,h,d);if(m.userData.scanned)worldUV(geo,m.userData.tileSize);const a=new THREE.Mesh(geo,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
function cyl(r1,r2,h,m,x,y,z,parent=scene,n=12){let a=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,n),m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a}
function beam(a,b,r,m,parent=scene){a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);const o=cyl(r,r,a.distanceTo(b),m,0,0,0,parent,6);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return o}
function label(text,w,h,color='#263e40',bg='#e4e1cf'){let c=document.createElement('canvas');c.width=512;c.height=128;let ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=color;ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.8}))}
// Paris square, street walls, valley view, plane trees and street furniture.
const city=buildCity(scene);const obstacles=city.obstacles;
const treeSpots=[];for(const s of [-1,1]){for(let z=-58;z<=58;z+=9.5){treeSpots.push({x:s*66,z});treeSpots.push({x:s*76.5,z:z+4.75});}for(let x=24;x<=56;x+=9.5){treeSpots.push({x:s*x,z:57.5,grate:true});treeSpots.push({x:s*x,z:-57.5,grate:true});}}
plantTrees(scene,[...treeSpots,...city.valleyTrees],obstacles);furnish(scene,obstacles,await loadModels(['street_lamp_01','outdoor_table_chair_set_01','potted_plant_02','planter_box_01']));await loadCarModels();const carMaterials=parkCars(scene,obstacles);const traffic=createTraffic(scene,obstacles);const walkers=(await Promise.all(['Male_Adult_01','Female_Adult_02','Male_Adult_08','Female_Adult_05','Male_Adult_03','Female_Adult_11','Male_Adult_14','Female_Adult_14'].map(n=>loadGLB(`./assets/models/people/${n}.glb`).then(g=>(g.userData.pace=n.startsWith('Male')?1.01:1.21,g.userData.sex=n.startsWith('Male')?'m':'f',g)).catch(()=>null)))).filter(Boolean);
// Shared idle, talk, phone and sit clips (Rocketbox, retargeted in place) for each sex.
const clips={m:{},f:{}};await Promise.all(Object.entries({look:'idle_look_around_01',talk:'gestic_talk_neutral_01',phone:'cell_phone_textmessage',sit:'sit_chair_idle_neutral_01'}).flatMap(([k,f])=>['m','f'].map(sx=>loadGLB(`./assets/models/people/anims/${sx}_${f}.glb`).then(g=>{if(g.animations[0])clips[sx][k]=g.animations[0];}).catch(()=>{}))));
const life=createLife(scene,obstacles,treeSpots,city.water,walkers,clips);
// Concrete skate plaza (see skatepark.js): kickers, funbox, bank-to-quarter, ledge, manual pad, stair set, flat bars.
const park=buildSkatepark(scene,obstacles);const rails=park.rails,ramps=park.footprints;
// Fountain, planted islands, bench-ledges and paving bands in the middle of the square (see plaza.js).
const plaza=buildPlaza(scene,obstacles,rails);const matte=buildMatte(scene,scene.fog.color);const squareProps=buildSquareProps(scene,obstacles);const daylight=new Daylight({scene,renderer,sun,hemi,visuals,matte,fog:scene.fog});ramps.push(...plaza.footprints);plantTrees(scene,plaza.treeSpots,obstacles);

// Worn stencil paint on the stone instead of a sign board.
const railSign=(()=>{const c=document.createElement('canvas');c.width=1024;c.height=128;const g=c.getContext('2d');g.fillStyle='#d9f25c';g.font='900 74px "Barlow Condensed","Helvetica Neue",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('LAND ON BAR  /  GRIND',512,66);g.globalCompositeOperation='destination-out';for(let i=0;i<2600;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.9})`;g.fillRect(Math.random()*1024,Math.random()*128,1+Math.random()*5,1+Math.random()*3);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;const m=new THREE.Mesh(new THREE.PlaneGeometry(5,.62),new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.55,polygonOffset:true,polygonOffsetFactor:-3}));m.receiveShadow=true;return m;})();// (No writing on the ground at the spawn point.)

const ringMat=new THREE.MeshStandardMaterial({color:'#d5f766',emissive:'#a4bc32',emissiveIntensity:.5});const rings=[];for(const [x,y,z]of []){let r=new THREE.Mesh(new THREE.TorusGeometry(1.4,.07,8,40),ringMat);r.position.set(x,y,z);scene.add(r);rings.push(r)}
// Visible perimeter walls match the collision boundary.
for(const x of [-126,126])obstacles.push({x,z:0,w:.8,d:252,h:1.3,label:'Boundary wall'});for(const z of [-126,126])obstacles.push({x:0,z,w:252,d:.8,h:1.3,label:'Boundary wall'});
batchStatic(scene,new Set(rings));
// Six-wheel mid-drive power chair and seated rider (see avatar.js).
const avatar=buildAvatar(scene,await loadGLB('./assets/models/power_chair/power_chair.glb').catch(e=>{console.warn('Chair model unavailable',e);return null;}),await loadGLB('./assets/models/people/rider.glb').catch(e=>{console.warn('Rider model unavailable',e);return null;}));const {player,rig,wheels,jets,rider,casters,joints}=avatar;const crashRider=new CrashRider(scene,avatar.riderMaterials);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,32),new THREE.MeshBasicMaterial({color:'#13262a',transparent:true,opacity:.1,depthWrite:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
let started=false,paused=false,speed=0,heading=Math.PI,pos=new THREE.Vector3(0,0,26),vy=0,grounded=true,nitro=100,score=0,best=0,airTime=0,spin=0,flip=0,trickTimeout=0,cameraMode=0,jumps=0,spins=0,collected=0;try{best=Number(localStorage.getItem('paris-overdrive-best'))||0}catch{}$('best').textContent=best;const keys=new Set();let vehicle=createVehicle(),accumulator=0,landingShake=0;let seenHit=0,seenCrash=0,deathCount=0,photoMode=false,photoBusy=false,damageFlash=0;let crashAccumulator=0;
function start(){started=true;document.body.classList.add('riding');$('start').blur()}
function popup(s){$('trick').textContent=s;trickTimeout=2.5}
function reset(){crashRider.stop();rider.visible=true;$('crash').hidden=true;keys.clear();seenHit=seenCrash=0;vehicle=createVehicle();accumulator=0;pos.set(0,0,26);camYaw=Math.PI;speed=0;vy=0;heading=Math.PI;grounded=true;airTime=0;spin=0;flip=0;rig.rotation.set(0,0,0)}
function openHelp(){if(photoMode||photoBusy)return;paused=true;keys.clear();if(typeof stick!=='undefined'){stick.id=null;stick.x=stick.y=0;stick.lean=false;stickEl.classList.remove('on');}$('dialog').showModal()}function closeHelp(){paused=false;$('dialog').close();clock.getDelta()}
$('start').onclick=start;$('help').onclick=openHelp;$('close').onclick=closeHelp;$('resume').onclick=closeHelp;$('dialog').addEventListener('cancel',e=>{e.preventDefault();closeHelp()});
const hud={speed:0,score:0,health:0,lastScore:0,lastHealth:100};
const gameKeys=['KeyT','KeyF','KeyG','KeyM','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyE','ShiftLeft','ShiftRight','KeyC','KeyR','KeyP','Escape'];addEventListener('keydown',e=>{if(!gameKeys.includes(e.code)||e.target.closest&&e.target.closest('input,textarea'))return;e.preventDefault();if(e.repeat)return;if(e.code==='KeyP'){togglePhoto();return;}if(photoMode||photoBusy){if(e.code==='Escape')togglePhoto();return;}if(e.code==='Escape'){paused?closeHelp():openHelp();return}if(paused)return;if(e.code==='KeyR')reset();if(e.code==='KeyC')cameraMode=(cameraMode+1)%3;if(e.code==='KeyM')document.body.classList.toggle('show-map');if(e.code==='KeyT')popup(daylight.step(1));if((e.code==='KeyF'||e.code==='KeyG')&&started&&!paused)flipVehicle(vehicle,e.code==='KeyF'?1:-1);keys.add(e.code);if(!started)start();if(e.code==='Space')jump()});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(started&&!paused&&!photoMode&&!photoBusy)openHelp()});for(let b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);if(paused)return;start();keys.add(b.dataset.key);if(b.dataset.key==='Space')jump();if(b.dataset.key==='KeyF')flipVehicle(vehicle,1)});for(let ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key))}
function jump(){if(started&&!paused&&!photoMode&&!photoBusy&&jumpVehicle(vehicle)){jumps++;}}
// Power-chair joystick: press anywhere on the view (mouse or finger) and drag. Forward drives, back
// reverses, sideways turns (on the spot when the stick is only sideways); letting go centres it and the
// chair stops. Dragging with the right mouse button leans instead; a right click or wheel click jumps;
// scrolling up fires nitro. A gamepad's left stick drives too (A jump, RT nitro, LB lean, Y camera).
const STICK_R=70,stick={id:null,lean:false,ox:0,oy:0,x:0,y:0,boost:0,downAt:0,moved:0};
const view=renderer.domElement,stickEl=$('stick');
const showStick=(on,x=0,y=0)=>{stickEl.classList.toggle('on',on);if(on){stickEl.style.left=x+'px';stickEl.style.top=y+'px';}};
view.addEventListener('contextmenu',e=>e.preventDefault());
view.addEventListener('pointerdown',e=>{if(paused||photoMode||photoBusy)return;e.preventDefault();if(e.button===1){jump();return;}if(stick.id!==null)return;if(!started)start();
 stick.id=e.pointerId;stick.lean=e.button===2;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;stick.downAt=performance.now();stick.moved=0;try{view.setPointerCapture(e.pointerId);}catch{}showStick(true,e.clientX,e.clientY);stickEl.classList.toggle('lean',stick.lean);});
view.addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;let dx=(e.clientX-stick.ox)/STICK_R,dy=(e.clientY-stick.oy)/STICK_R;stick.moved=Math.max(stick.moved,Math.hypot(e.clientX-stick.ox,e.clientY-stick.oy));const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}stick.x=dx;stick.y=dy;});
const releaseStick=e=>{if(e.pointerId!==stick.id)return;if(stick.lean&&stick.moved<6&&performance.now()-stick.downAt<300)jump();stick.id=null;stick.x=stick.y=0;stick.lean=false;showStick(false);};
for(const ev of ['pointerup','pointercancel'])view.addEventListener(ev,releaseStick);
view.addEventListener('wheel',e=>{e.preventDefault();if(started&&!paused&&e.deltaY<0)stick.boost=Math.min(2.5,stick.boost+.5);},{passive:false});
// Gamepad: polled every frame; buttons act on press.
const padPrev=[];function readPad(){const list=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const p of list)if(p&&p.connected){gp=p;break;}if(!gp)return null;
 const b=i=>!!(gp.buttons[i]&&(gp.buttons[i].pressed||gp.buttons[i].value>.3)),edge=i=>{const now=b(i),was=padPrev[i];padPrev[i]=now;return now&&!was;};
 if(edge(9)){paused?closeHelp():openHelp();}if(paused)return null;if(!started&&(Math.hypot(gp.axes[0]||0,gp.axes[1]||0)>.3||b(0)))start();if(edge(0))jump();if(edge(2))flipVehicle(vehicle,1);if(edge(3))cameraMode=(cameraMode+1)%3;if(edge(1))reset();
 return {x:gp.axes[0]||0,y:gp.axes[1]||0,boost:b(7)||b(5),lean:b(4)||b(6)};}
function terrain(x,z){return Math.max(groundHeight(x,z),park.height(x,z),plaza.height(x,z));}
// Ramp transitions may rise steeply without counting as a ledge.
terrain.smooth=(x,z)=>park.smooth(x,z);
function awardStunt(result){score+=result.points;$('score').textContent=String(score).padStart(6,'0');popup(result.name+' +'+result.points);if(score>best){best=score;$('best').textContent=best;try{localStorage.setItem('paris-overdrive-best',best)}catch{}}}
function bank(){const rotations=Math.floor((Math.abs(spin)+.1)/(Math.PI*2));const flips=Math.floor((Math.abs(flip)+.1)/(Math.PI*2));let badFlip=Math.abs(Math.atan2(Math.sin(flip),Math.cos(flip)))>.65;if(badFlip){popup('BAIL · TRY AGAIN');vehicle.vx*=.25;vehicle.vz*=.25;return}const points=Math.round(airTime*120+rotations*600+flips*1000);score+=points;if(rotations)spins++;if(points>50)popup((flips?'FRONT FLIP':rotations?rotations*360+'° SPIN':'CLEAN AIR')+' +'+points);$('score').textContent=String(score).padStart(6,'0');if(score>best){best=score;$('best').textContent=best;try{localStorage.setItem('paris-overdrive-best',best)}catch{}}}
const skidMaterial=new THREE.MeshBasicMaterial({color:'#2b302d',transparent:true,opacity:.13,depthWrite:false});const skidMarks=Array.from({length:160},()=>{const mark=new THREE.Mesh(new THREE.PlaneGeometry(.16,.45),skidMaterial);mark.rotation.x=-Math.PI/2;mark.visible=false;scene.add(mark);return mark});let skidIndex=0,skidTimer=0;
applyClouds(scene);
// One-off reflection probe from the middle of the square: windows, car paint and the chair reflect
// the real facades and trees instead of only the sky.
{const probe=new THREE.WebGLCubeRenderTarget(512,{type:THREE.HalfFloatType});const cubeCam=new THREE.CubeCamera(.5,3000,probe);cubeCam.position.set(0,6,8);scene.add(cubeCam);player.visible=false;placeSun(new THREE.Vector3(0,0,8));renderer.shadowMap.needsUpdate=true;cubeCam.update(renderer,scene);player.visible=true;scene.remove(cubeCam);
 const cityEnv=new THREE.PMREMGenerator(renderer).fromCubemap(probe.texture).texture;probe.dispose();
 for(const m of [glassMaterial(),...carMaterials])m.envMap=cityEnv;player.traverse(o=>{if(o.isMesh&&(o.material.isMeshPhysicalMaterial||o.material.metalness>.8))o.material.envMap=cityEnv;});}
const clock=new THREE.Clock();const desired=new THREE.Vector3(),look=new THREE.Vector3();let camYaw=Math.PI,boostGlow=0;const chassis={accel:0,lat:0,air:0,pitch:{x:0,v:0},roll:{x:0,v:0},lean:{x:0,v:0},side:{x:0,v:0}};
// Wind streaks ride with the camera and rush past at speed or under nitro.
scene.add(camera);const STREAKS=110,streakPos=new Float32Array(STREAKS*6),streakSeed=Array.from({length:STREAKS},()=>({x:0,y:0,z:-200}));const streakGeo=new THREE.BufferGeometry();streakGeo.setAttribute('position',new THREE.BufferAttribute(streakPos,3));
const streakMat=new THREE.LineBasicMaterial({color:'#e8f4ff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});streakMat.userData.ground=true;const streaks=new THREE.LineSegments(streakGeo,streakMat);streaks.frustumCulled=false;camera.add(streaks);
function updateStreaks(dt){const amount=Math.min(1,Math.max(0,(speed-15)/11))*.28+boostGlow*.45;streakMat.opacity=amount;streaks.visible=amount>.01&&started;if(!streaks.visible)return;const len=.4+speed*.07+boostGlow*1.6;
 for(let i=0;i<STREAKS;i++){const p=streakSeed[i];p.z+=speed*(1.4+boostGlow)*dt;if(p.z>-1.5){const a=Math.random()*Math.PI*2,r=1.6+Math.random()*7;p.x=Math.cos(a)*r;p.y=Math.sin(a)*r*.6;p.z=-25-Math.random()*35;}streakPos.set([p.x,p.y,p.z,p.x,p.y,p.z-len],i*6);}streakGeo.attributes.position.needsUpdate=true;}
// Tyre smoke while the chair slides.
const smokeTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,2,32,32,32);r.addColorStop(0,'rgba(235,232,225,.55)');r.addColorStop(1,'rgba(235,232,225,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})();
const smoke=Array.from({length:48},()=>{const m=new THREE.SpriteMaterial({map:smokeTex,transparent:true,depthWrite:false,opacity:0});m.userData.ground=true;const sp=new THREE.Sprite(m);sp.visible=false;sp.userData.life=0;scene.add(sp);return sp;});let smokeIndex=0,smokeTimer=0;
function emitSmoke(dt){smokeTimer+=dt;if(smokeTimer<.035)return;smokeTimer=0;for(const side of [-1,1]){const sp=smoke[smokeIndex++%smoke.length];sp.position.set(pos.x+Math.cos(heading)*side*.6-Math.sin(heading)*.2,pos.y+.3,pos.z-Math.sin(heading)*side*.6-Math.cos(heading)*.2);sp.scale.setScalar(.6);sp.userData.life=1;sp.userData.vy=.4+Math.random()*.4;sp.visible=true;}}
// Road spray: the wet paving throws a fine mist back from the drive wheels at speed.
const sprayTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,1,32,32,32);r.addColorStop(0,'rgba(225,235,240,.7)');r.addColorStop(.5,'rgba(215,228,235,.25)');r.addColorStop(1,'rgba(215,228,235,0)');g.fillStyle=r;g.fillRect(0,0,64,64);for(let i=0;i<40;i++){g.fillStyle='rgba(255,255,255,.55)';g.fillRect(16+Math.random()*32,16+Math.random()*32,1.5,1.5);}return new THREE.CanvasTexture(c);})();
const spray=Array.from({length:64},()=>{const m=new THREE.SpriteMaterial({map:sprayTex,transparent:true,depthWrite:false,opacity:0});m.userData.ground=true;const sp=new THREE.Sprite(m);sp.visible=false;sp.userData={life:0,v:new THREE.Vector3()};scene.add(sp);return sp;});let sprayIndex=0,sprayTimer=0;
function emitSpray(dt){sprayTimer+=dt;const every=.06-Math.min(.04,speed*.0015);if(sprayTimer<every)return;sprayTimer=0;const fx=Math.sin(heading),fz=Math.cos(heading),rx=Math.cos(heading),rz=-Math.sin(heading);
 for(const side of [-1,1]){const sp=spray[sprayIndex++%spray.length];sp.position.set(pos.x+rx*side*.3+fx*.1,pos.y+.12,pos.z+rz*side*.3+fz*.1);sp.userData.v.set(-fx*speed*.35+rx*side*.8,.9+Math.random()*.6,-fz*speed*.35+rz*side*.8);sp.userData.life=1;sp.userData.max=.35+speed*.012;sp.scale.setScalar(.25);sp.visible=true;}}
function updateSpray(dt){for(const sp of spray){if(!sp.visible)continue;const u=sp.userData;u.life-=dt*2.2;if(u.life<=0){sp.visible=false;continue;}u.v.y-=4*dt;u.v.multiplyScalar(Math.exp(-dt*2));sp.position.addScaledVector(u.v,dt);sp.scale.setScalar(.25+(1-u.life)*u.max*3);sp.material.opacity=u.life*.5;}}
function updateSmoke(dt){for(const sp of smoke){if(!sp.visible)continue;sp.userData.life-=dt*.9;if(sp.userData.life<=0){sp.visible=false;continue;}sp.position.y+=sp.userData.vy*dt;sp.scale.setScalar(.6+(1-sp.userData.life)*2.6);sp.material.opacity=sp.userData.life*.45;}}camera.position.set(12,7.5,40);const mc=$('map').getContext('2d');
function update(dt){if(!started||paused||photoMode||photoBusy)return;
 let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)-(keys.has('KeyD')||keys.has('ArrowRight')?1:0);
 // Joystick (on-screen or gamepad, whichever is pushed further), with a small dead zone at the centre.
 const pad=readPad();let sx=stick.x,sy=stick.y,stickLean=stick.id!==null&&stick.lean;if(pad&&Math.hypot(pad.x,pad.y)>Math.hypot(sx,sy)){sx=pad.x;sy=pad.y;stickLean=stickLean||pad.lean;}
 const dz=v=>Math.abs(v)<.12?0:(v-Math.sign(v)*.12)/.88,balance=keys.has('KeyE')||stickLean;
 // Push distance sets the speed and the angle mixes in turning: a full diagonal is full speed plus a hard
 // turn (a drift at pace), straight sideways spins on the spot, and pulling back reverses.
 const mag=Math.min(1,Math.hypot(sx,sy));if(!forward&&mag>.12)forward=dz(mag)*THREE.MathUtils.clamp(-sy/mag*1.6,-1,1);if(!side)side=-dz(sx);
 stick.boost=Math.max(0,stick.boost-dt);$('stick-knob').style.transform=`translate(${stick.x*STICK_R}px,${stick.y*STICK_R}px)`;
 // Surface under the chair: loose gravel promenades and cobbled gutters grip less and drag more.
 const ax=Math.abs(pos.x),az=Math.abs(pos.z),onGravel=ax>60&&ax<80.5&&az<64.2,onCobble=(az>64.5&&az<65.1)||(az>78.9&&az<79.5),inFountain=plaza.wet(pos.x,pos.z),rough=onGravel?.8:onCobble?1:.12;
 const input={throttle:balance?0:forward,steer:balance?0:side,boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||stick.boost>0||!!(pad&&pad.boost),balance,leanForward:balance?forward:0,leanSide:balance?side:0,surface:inFountain?{grip:.7,rolling:.9}:onGravel?{grip:.78,rolling:.45}:onCobble?{grip:.9,rolling:.15}:{grip:1,rolling:0}};
 const prevLong=vehicle.vx*Math.sin(vehicle.yaw)+vehicle.vz*Math.cos(vehicle.yaw);
 accumulator+=dt;while(accumulator>=1/120){const wasGrounded=vehicle.grounded;const landing=stepVehicle(vehicle,input,1/120,terrain,obstacles,rails);if(wasGrounded&&!vehicle.grounded)jumps++;if(landing){airTime=landing.duration;spin=landing.spin;flip=landing.flip;if(landing.clean)bank();landingShake=Math.min(landing.impact*.008,.1);}for(const field of ['stanceFinished','railFinished']){const result=vehicle[field];if(result){if(result.clean&&result.points>0){awardStunt(result);spins++;}else if(!result.clean)popup('BAIL · COMBO LOST');vehicle[field]=null;}}if(crashRider.group.visible)crashRider.step(1/120,terrain,obstacles);accumulator-=1/120;}
 pos.set(vehicle.x,vehicle.y,vehicle.z);heading=vehicle.yaw;grounded=vehicle.grounded;speed=Math.hypot(vehicle.vx,vehicle.vz);nitro=vehicle.nitro;
 if(vehicle.hitId!==seenHit){seenHit=vehicle.hitId;damageFlash=.65;landingShake=.15+Math.min(vehicle.lastDamage/120,.35);}
 if(vehicle.crashId!==seenCrash){seenCrash=vehicle.crashId;rider.visible=false;crashRider.start(pos,heading,new THREE.Vector3(vehicle.vx+Math.sin(heading)*3,3,vehicle.vz+Math.cos(heading)*3));if(vehicle.state==='dead')deathCount++;keys.clear();}
 if(vehicle.state==='riding'){
  // Weight transfer: squat under drive, dive under braking, roll out of corners; nose follows the arc in the air.
  const longNow=vehicle.vx*Math.sin(vehicle.yaw)+vehicle.vz*Math.cos(vehicle.yaw),longAcc=dt>0?(longNow-prevLong)/dt:0,latAcc=vehicle.grounded?vehicle.yawRate*speed:0;
  chassis.accel+=(longAcc-chassis.accel)*(1-Math.exp(-dt*8));chassis.lat+=(latAcc-chassis.lat)*(1-Math.exp(-dt*8));
  // Semi-implicit springs in fixed sub-steps: stable at any frame rate (a slow or throttled frame
  // used to make them diverge and spin the chair model).
  const spr=(st,target,k,c)=>{const n=Math.min(12,Math.ceil(dt/.012)),h=dt/n;for(let i=0;i<n;i++){st.v+=((target-st.x)*k-st.v*c)*h;st.x+=st.v*h;}if(!Number.isFinite(st.x)){st.x=0;st.v=0;}return st.x;};
  const visPitch=spr(chassis.pitch,THREE.MathUtils.clamp(-chassis.accel*.0055,-.06,.07),180,16),visRoll=spr(chassis.roll,THREE.MathUtils.clamp(chassis.lat*.0055,-.06,.06),160,14);
  chassis.air+=((vehicle.grounded?0:THREE.MathUtils.clamp(-Math.atan2(vehicle.vy,Math.max(speed,2))*.45,-.38,.38))-chassis.air)*(1-Math.exp(-dt*(vehicle.grounded?10:2.5)));
  rig.rotation.set(vehicle.pitch+vehicle.tiltPitch+visPitch+chassis.air,vehicle.spin,vehicle.roll+vehicle.tiltRoll+visRoll);
  // Rider inertia: torso leans against the acceleration, the head stays level and looks into turns.
  joints.spine.rotation.x=spr(chassis.lean,THREE.MathUtils.clamp(-chassis.accel*.018+vehicle.springVelocity*.02,-.22,.26),70,9);joints.spine.rotation.z=spr(chassis.side,THREE.MathUtils.clamp(chassis.lat*.016,-.2,.2),60,8);
  joints.neck.rotation.x=-joints.spine.rotation.x*.55;joints.neck.rotation.z=-joints.spine.rotation.z*.7;joints.head.rotation.y+=(THREE.MathUtils.clamp(vehicle.yawRate*.22,-.4,.4)-joints.head.rotation.y)*(1-Math.exp(-dt*5));avatar.applyJoints();
  // Rotate around the wheel edge that still supports the chair, rather than its centre.
  const E=CHAIR.edge,pivot=new THREE.Vector3(vehicle.tiltRoll>0?-E.side:vehicle.tiltRoll<0?E.side:0,0,vehicle.tiltPitch>0?E.front:vehicle.tiltPitch<0?E.rear:0);
  if(!grounded)pivot.set(0,E.air,0);
  const offset=pivot.clone().sub(pivot.clone().applyEuler(rig.rotation));rig.position.copy(offset);rig.position.y+=vehicle.suspension;
 }else{rig.rotation.set(vehicle.crashPitch,0,vehicle.crashRoll);const pivot=new THREE.Vector3(0,.55,0).applyEuler(rig.rotation);rig.position.set(-pivot.x,.58-pivot.y,-pivot.z);}
 $('stunt-live').hidden=!(vehicle.rail||vehicle.stance);document.body.classList.toggle('balancing',!!(vehicle.rail||vehicle.stance));$('stunt-name').textContent=vehicle.rail?'RAIL GRIND':STANCE_NAMES[vehicle.stance]||'';$('stunt-readout').textContent=vehicle.rail?vehicle.railDistance.toFixed(1)+' m · '+Math.floor(vehicle.railTime*160+vehicle.railDistance*28)+' PTS':vehicle.stanceTime.toFixed(1)+' s · '+Math.floor(vehicle.stancePoints)+' PTS';
 $('health-fill').style.width=vehicle.health+'%';$('health-value').textContent=Math.ceil(vehicle.health);$('health-fill').style.background=vehicle.health<30?'#f36b57':'#dbfc55';damageFlash=Math.max(0,damageFlash-dt);$('damage-flash').style.opacity=damageFlash;
 const crashed=vehicle.state!=='riding';$('crash').hidden=!crashed;if(crashed){$('crash-title').textContent=vehicle.state==='dead'?'FATAL IMPACT':'WIPED OUT';$('crash-detail').textContent=vehicle.cause+' · '+Math.ceil(vehicle.health)+' health remaining';$('respawn').disabled=vehicle.crashTimer<1.5;$('respawn').textContent=vehicle.crashTimer<1.5?'…':'RESPAWN ↗';}
 skidTimer+=dt;if(grounded&&speed>3&&(vehicle.slip>.8)&&skidTimer>.04){skidTimer=0;for(const side of [-1,1]){const mark=skidMarks[skidIndex++%skidMarks.length];mark.position.set(pos.x+Math.cos(heading)*side*.55,pos.y+.025,pos.z-Math.sin(heading)*side*.55);mark.rotation.z=-heading;mark.visible=true;}}
 for(let j of jets){j.visible=vehicle.boost;j.scale.set(.85+Math.random()*.3,.7+Math.random()*.9,.85+Math.random()*.3);}// Castors trail their own contact-point velocity, so they swing round on turns and on reversing.
 {const lat=vehicle.vx*Math.cos(vehicle.yaw)-vehicle.vz*Math.sin(vehicle.yaw),lon=vehicle.vx*Math.sin(vehicle.yaw)+vehicle.vz*Math.cos(vehicle.yaw),w=vehicle.yawRate;for(const c of casters){const vx=lat+w*c.z,vz=lon-w*c.x;if(Math.hypot(vx,vz)>.15){const target=Math.atan2(vx,vz);c.angle+=Math.atan2(Math.sin(target-c.angle),Math.cos(target-c.angle))*(1-Math.exp(-dt*9));c.fork.rotation.y=c.angle;}c.wheel.userData.speed=Math.hypot(vx,vz);}}
 for(let w of wheels)w.rotation.x+=(w.userData.speed??speed)*dt/(w.userData.r||.31);
 if(grounded&&vehicle.state==='riding')rig.position.y+=(Math.random()-.5)*.012*rough*Math.min(speed/10,1);
 boostGlow+=((vehicle.boost?1:0)-boostGlow)*(1-Math.exp(-dt*(vehicle.boost?6:2.5)));
 visuals.boost=boostGlow;visuals.speedBlur=vehicle.state==='riding'?Math.min(1,Math.max(0,(speed-8)/18))*.85+boostGlow*.3:0;
 if(grounded&&speed>8&&vehicle.slip>1.4&&vehicle.state==='riding')emitSmoke(dt);
 if(grounded&&speed>6&&!onGravel&&vehicle.state==='riding')emitSpray(dt);
 for(let r of rings){if(vehicle.state==='riding'&&r.visible&&r.position.distanceTo(pos.clone().add(new THREE.Vector3(0,1,0)))<2.3){r.visible=false;collected++;score+=500;popup('SKY TOKEN +500');$('score').textContent=String(score).padStart(6,'0');best=Math.max(best,score);$('best').textContent=best;try{localStorage.setItem('paris-overdrive-best',best)}catch{}}}
 $('speed').textContent=Math.round(Math.abs(speed)*3.6);$('nitro').style.width=nitro+'%';
 // Contextual HUD: speed while moving, score when it changes, health after damage.
 hud.speed=Math.abs(speed)>1.5||vehicle.boost?2:Math.max(0,hud.speed-dt);if(score!==hud.lastScore){hud.lastScore=score;hud.score=3;}else hud.score=Math.max(0,hud.score-dt);if(vehicle.health<hud.lastHealth-.5)hud.health=4;hud.lastHealth=vehicle.health;hud.health=Math.max(0,hud.health-dt);
 document.body.classList.toggle('show-speed',hud.speed>0);document.body.classList.toggle('show-score',hud.score>0);document.body.classList.toggle('show-health',hud.health>0||vehicle.health<35);let stage=jumps===0?0:spins===0?1:collected===0?2:3;$('challenge').textContent=['01 / Get some air','02 / Find your balance','03 / Chase the sky','Line complete. Keep riding.'][stage];$('challengeDesc').textContent=['Hit a ramp or jump to start your first combo.','Get moving, hold E + a direction, then release to catch your balance.','Jump through a glowing ring to collect 500 points.','Find new lines and beat your session best.'][stage];$('progress').style.width=stage/3*100+'%';
}
async function togglePhoto(){if(photoBusy)return;if(photoMode){photoMode=false;visuals.exitPhoto();$('photo-panel').hidden=true;document.body.classList.remove('photograph');clock.getDelta();return;}if(paused)closeHelp();photoBusy=true;keys.clear();$('photo-panel').hidden=false;document.body.classList.add('photograph');$('photo-status').textContent='Preparing ray-traced scene…';await new Promise(resolve=>setTimeout(resolve,80));const ok=await visuals.enterPhoto(text=>{$('photo-status').textContent=text});photoBusy=false;photoMode=ok;if(!ok){document.body.classList.remove('photograph');setTimeout(()=>{$('photo-panel').hidden=true},6000);}}
$('photo-button').onclick=togglePhoto;$('exit-photo').onclick=togglePhoto;$('respawn').onclick=()=>{reset();};$('save-photo').onclick=()=>{const a=document.createElement('a');a.download='paris-overdrive.png';a.href=renderer.domElement.toDataURL('image/png');a.click();};
function avoidCameraWalls(target,eye){const direction=eye.clone().sub(target);let nearest=1;for(const o of obstacles){if((o.h??35)<2)continue;const mins=[o.x-o.w/2-.2,o.minY??0,o.z-o.d/2-.2],maxs=[o.x+o.w/2+.2,o.h??35,o.z+o.d/2+.2];let low=0,high=1;const start=target.toArray(),delta=direction.toArray();for(let axis=0;axis<3;axis++){if(Math.abs(delta[axis])<1e-6){if(start[axis]<mins[axis]||start[axis]>maxs[axis]){low=2;break}}else{let a=(mins[axis]-start[axis])/delta[axis],b=(maxs[axis]-start[axis])/delta[axis];if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>high)break}}if(low<=high&&low>0&&low<nearest)nearest=low;}if(nearest<1)eye.copy(target).addScaledVector(direction,Math.max(.1,nearest-.04));}
function drawMap(){mc.clearRect(0,0,160,160);mc.strokeStyle='#d9ecec33';mc.lineWidth=1;for(let i=25;i<160;i+=27){mc.beginPath();mc.moveTo(i,10);mc.lineTo(i,150);mc.stroke();mc.beginPath();mc.moveTo(10,i);mc.lineTo(150,i);mc.stroke()}mc.strokeStyle='#dbfc5599';mc.lineWidth=2;for(const r of rails){mc.beginPath();mc.moveTo(80+r.ax*.8,80+r.az*.8);mc.lineTo(80+r.bx*.8,80+r.bz*.8);mc.stroke();}mc.fillStyle='#dce4d580';for(let r of ramps)mc.fillRect(80+r.x*.8-r.w*.4,80+r.z*.8-r.d*.4,r.w*.8,r.d*.8);for(let r of rings)if(r.visible){mc.fillStyle='#daf55a';mc.beginPath();mc.arc(80+r.position.x*.8,80+r.position.z*.8,2,0,7);mc.fill()}mc.save();mc.translate(80+pos.x*.8,80+pos.z*.8);mc.rotate(-heading);mc.fillStyle='#e6ff70';mc.beginPath();mc.moveTo(0,7);mc.lineTo(-4,-4);mc.lineTo(4,-4);mc.closePath();mc.fill();mc.restore()}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1);if(photoMode||photoBusy){visuals.render(text=>{$('photo-status').textContent=text});return;}cloudUniform.value=performance.now()*.001;update(dt);if(!paused){for(const e of life(dt,pos,started?speed:0))if(e.type==='knock'&&vehicle.state==='riding'){
  // Hitting someone costs momentum and, above a fast walk, hurts the rider too.
  popup(e.speed>7?'PEDESTRIAN DOWN · HARD HIT':'PEDESTRIAN DOWN');vehicle.vx*=.55;vehicle.vz*=.55;vehicle.springVelocity-=1.2;landingShake=Math.max(landingShake,.06);if(e.speed>4)hurtVehicle(vehicle,Math.min(70,(e.speed-4)*3.4),'Hit a pedestrian',e.speed>17);}
 traffic(dt,pos);}plaza.update(dt,performance.now()*.001);updateTrees(performance.now()*.001);matte.update(camera);{const now=performance.now()*.001;daylight.update(now);daylight.follow(camera,now);sunDir.copy(daylight.lightDir);if(sunDir.y<.12){sunDir.y=.12;sunDir.normalize();}sunUniform.value.copy(sunDir);}squareProps(dt,performance.now()*.001);player.position.copy(pos);player.rotation.y=heading;shadow.position.set(pos.x,terrain(pos.x,pos.z)+.03,pos.z);shadow.scale.setScalar(1+pos.y*.08);if(!started){const t=performance.now()*.00008;desired.set(pos.x+10+Math.sin(t)*2,7.1,pos.z+12);look.set(pos.x-3,1.8,pos.z-5);jets.forEach(j=>j.visible=false)}else{const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),travel=speed>4?Math.atan2(vehicle.vx,vehicle.vz):heading,aim=heading+wrap(travel-heading)*.45;camYaw+=wrap(aim-camYaw)*(1-Math.exp(-dt*6));
  // Framed for the real-scale chair (about 1.1 m long, rider's head at 1.3 m).
  const dist=cameraMode===1?11:cameraMode===2?3.3:4.3+speed*.06,height=cameraMode===1?7:cameraMode===2?1.95:1.75+speed*.018;
  desired.set(pos.x-Math.sin(camYaw)*dist,pos.y+height,pos.z-Math.cos(camYaw)*dist);const ahead=4+speed*.45;look.set(pos.x+Math.sin(camYaw)*ahead,pos.y+.95,pos.z+Math.cos(camYaw)*ahead)}
 if(started)avoidCameraWalls(look,desired);camera.position.lerp(desired,1-Math.exp(-dt*(cameraMode===0?7+speed*.2:4)));if(started)avoidCameraWalls(look,camera.position);landingShake*=Math.exp(-dt*8);
 const now=performance.now()*.001,shake=landingShake+boostGlow*.035+Math.max(0,speed-14)*.0015;camera.position.x+=Math.sin(now*37.1)*shake*.6;camera.position.y+=Math.sin(now*41.7+1.3)*shake;camera.position.z+=Math.sin(now*33.3+2.1)*shake*.6;
 camera.lookAt(look);const targetFov=(cameraMode===2?60:57)+Math.min(speed,30)*.62+boostGlow*9;camera.fov=THREE.MathUtils.lerp(camera.fov,targetFov,1-Math.exp(-dt*4));camera.updateProjectionMatrix();updateStreaks(dt);updateSmoke(dt);updateSpray(dt);if(!paused){trickTimeout-=dt;if(trickTimeout<0)$('trick').textContent='';rings.forEach(r=>r.rotation.z+=dt*.4)}drawMap();placeSun(pos);visuals.adapt(dt);visuals.render(()=>{},dt)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);visuals.resize()});window.__game={get vehicle(){return vehicle},get state(){return{started,paused,speed,nitro,score,jumps,spins,collected,grounded,position:pos.toArray(),vehicle:{...vehicle}}},scene,renderer,visuals};$('loading').hidden=true;animate();
