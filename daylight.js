import * as THREE from './vendor/three.module.js';
import {Sky} from './vendor/jsm/objects/Sky.js';
import {LAMPS} from './props.js';
import {TOWER} from './city.js';
import {sunLevel} from './materials.js';
// Light follows the real time of day in Paris. The sun's altitude and azimuth come from the clock
// (a compact solar-position formula for the Trocadéro), turned into the game's frame where -z faces
// the Eiffel Tower (bearing 133°). A physically based sky (three.js Sky) plus a drifting cloud layer
// replaces the fixed sunset photo, the image-based lighting is regenerated from that sky, and the
// sun's colour, the fill, haze, exposure and god rays follow. At night the lamps light up and warm
// pools of light follow the chair. T steps the clock forward an hour; ?hour=21.5 pins the time.
const LAT=48.8616,LON=2.2893,RAD=Math.PI/180,TOWER_BEARING=133*RAD;
export function sunPosition(date){const d=date.getTime()/86400000+2440587.5-2451545;const g=(357.529+.98560028*d)*RAD,q=280.459+.98564736*d;
 const L=(q+1.915*Math.sin(g)+.02*Math.sin(2*g))*RAD,e=(23.439-.00000036*d)*RAD;const ra=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L));
 const gmst=((18.697374558+24.06570982441908*d)%24+24)%24,ha=(gmst*15+LON)*RAD-ra,lat=LAT*RAD;
 const alt=Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(ha));
 const az=Math.atan2(-Math.sin(ha),Math.tan(dec)*Math.cos(lat)-Math.sin(lat)*Math.cos(ha));return {alt,az:(az+2*Math.PI)%(2*Math.PI)};}
export function sunVector(alt,az,out=new THREE.Vector3()){const d=az-TOWER_BEARING,c=Math.cos(alt);return out.set(Math.sin(d)*c,Math.sin(alt),-Math.cos(d)*c);}
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

function cloudMaterial(){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,fog:false,
 uniforms:{uTime:{value:0},uSun:{value:new THREE.Vector3()},uLit:{value:new THREE.Color()},uShade:{value:new THREE.Color()},uCover:{value:.48}},
 vertexShader:'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec3 vDir;uniform float uTime;uniform vec3 uSun;uniform vec3 uLit;uniform vec3 uShade;uniform float uCover;
 float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<6;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
 void main(){if(vDir.y<0.)discard;vec2 uv=vDir.xz/(vDir.y+.18)*1.6+vec2(uTime*.004,uTime*.0016);
  float c=fbm(uv),d=fbm(uv*2.3+3.1);float a=smoothstep(uCover,uCover+.28,c)*smoothstep(0.,.14,vDir.y);
  float lit=pow(max(0.,dot(normalize(vDir),uSun))*.5+.5,3.);vec3 col=mix(uShade,uLit,clamp(.35+.65*lit-(d-.5)*.6,0.,1.));
  gl_FragColor=vec4(col,a*.92);}`});}

export class Daylight{
 constructor({scene,renderer,sun,hemi,visuals,matte,fog}){Object.assign(this,{scene,renderer,sun,hemi,visuals,matte,fog});
  const q=new URLSearchParams(location.search);this.pinned=q.has('hour')?parseFloat(q.get('hour')):null;this.offset=0;
  this.sky=new Sky();this.sky.scale.setScalar(2800);this.sky.renderOrder=-10;this.sky.frustumCulled=false;scene.add(this.sky);
  // The physical sky is calibrated for a darker pipeline: scale it so the image-based light stays sane.
  for(const m of [this.sky.material]){m.fragmentShader=m.fragmentShader.replace('gl_FragColor = vec4( retColor, 1.0 );','gl_FragColor = vec4( retColor * skyScale, 1.0 );').replace('void main() {','uniform float skyScale;\nvoid main() {');}
  const u=this.sky.material.uniforms;u.skyScale={value:.55};u.turbidity.value=4;u.rayleigh.value=1.4;u.mieCoefficient.value=.006;u.mieDirectionalG.value=.86;
  this.clouds=new THREE.Mesh(new THREE.SphereGeometry(2500,48,24,0,Math.PI*2,0,Math.PI/2),cloudMaterial());this.clouds.renderOrder=-9;this.clouds.frustumCulled=false;scene.add(this.clouds);
  // A sky-only scene for regenerating the image-based lighting.
  this.envScene=new THREE.Scene();this.envSky=new Sky();this.envSky.scale.setScalar(100);this.envSky.material.uniforms=u;this.envSky.material.fragmentShader=this.sky.material.fragmentShader;this.envScene.add(this.envSky);
  this.envClouds=new THREE.Mesh(this.clouds.geometry.clone().scale(.035,.035,.035),this.clouds.material);this.envScene.add(this.envClouds);
  this.pmrem=new THREE.PMREMGenerator(renderer);this.env=null;this.lastEnv=-1e9;this.lastAlt=99;
  this.dir=new THREE.Vector3(0,1,0);this.lightDir=new THREE.Vector3(0,1,0);this.lamps=Array.from({length:6},()=>{const l=new THREE.PointLight('#ffc27a',0,26,2);l.castShadow=false;scene.add(l);return l;});this.lampAt=0;
  this.bulbs=[];scene.traverse(o=>{if(o.material&&/bulb/.test(o.material.name||'')&&!this.bulbs.includes(o.material))this.bulbs.push(o.material);});
  scene.background=null;this.update(0,true);}
 date(){const d=new Date(Date.now()+this.offset*3600000);if(this.pinned!==null){d.setHours(Math.floor(this.pinned),Math.round(this.pinned%1*60),0,0);d.setTime(d.getTime()+this.offset*3600000);}return d;}
 step(h=1){this.offset+=h;this.lastEnv=-1e9;const d=this.date();return d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}
 update(now,force=false){const {alt,az}=sunPosition(this.date());sunVector(alt,az,this.dir);const deg=alt/RAD;
  const day=smooth(-6,6,deg),low=1-smooth(4,30,deg),night=1-smooth(-10,-2,deg);
  this.sky.material.uniforms.sunPosition.value.copy(this.dir);
  // Sun: warm and weak near the horizon, white and strong high up; gone below the horizon.
  this.sun.color.setRGB(1,.96-.34*low,.9-.55*low);this.sun.intensity=5.6*smooth(-1,8,deg)*(.75+.25*smooth(10,40,deg));
  // Moonlight takes over at night: cool, soft, from high in the south-east of the view.
  this.lightDir.copy(this.dir);if(night>.01){const k=night;this.sun.color.lerp(new THREE.Color(.55,.66,.95),k);this.sun.intensity=Math.max(this.sun.intensity,.55*k);this.lightDir.lerp(new THREE.Vector3(.35,.85,-.4).normalize(),k).normalize();}
  // The tower's golden floodlighting after dark, and its sparkle for five minutes on the hour.
  if(TOWER.iron){TOWER.iron.emissiveIntensity=night*.9;TOWER.lace.emissiveIntensity=night*.7;const m=this.date().getMinutes(),on=night>.5&&m<5;TOWER.sparkle.visible=on;if(on)TOWER.sparkle.material.opacity=.55+.45*Math.sin(now*23.7);}
  this.hemi.intensity=.12+.08*day;this.hemi.color.setRGB(.55+.4*day,.62+.33*day,.8+.15*day);
  this.scene.environmentIntensity=.06+.46*day;this.scene.backgroundIntensity=1;
  this.renderer.toneMappingExposure=.86+.9*night*.6+.15*low*day;
  // Haze picks up the horizon colour: blue-grey by day, amber at dusk, deep blue at night.
  this.fog.color.setRGB(.16*night+(.55+.15*low)*day,.18*night+(.56-.04*low)*day,.26*night+(.62-.16*low)*day).multiplyScalar(day*.95+.06);
  const cu=this.clouds.material.uniforms;cu.uTime.value=now;cu.uSun.value.copy(this.dir);cu.uLit.value.setRGB(1,.92-.3*low,.85-.45*low).multiplyScalar(.15+.95*day);cu.uShade.value.setRGB(.42,.44,.5).multiplyScalar(.08+.75*day);
  if(this.matte)this.matte.setLight(.12+.88*day,low);
  this.visuals.sunDirection.copy(this.dir);this.visuals.raysScale=smooth(0,5,deg)*(1-smooth(14,30,deg));
  this.sky.material.uniforms.skyScale.value=.5+.15*low;
  for(const m of this.bulbs)m.emissiveIntensity=.4+5.5*night;sunLevel.value=smooth(-2,10,deg);
  // Regenerate image-based lighting when the sun has moved enough.
  if(force||Math.abs(deg-this.lastAlt)>.6||now-this.lastEnv>120){this.lastAlt=deg;this.lastEnv=now;if(this.env)this.env.dispose();this.env=this.pmrem.fromScene(this.envScene,0,.1,1000);this.scene.environment=this.env.texture;}
  return night;}
 follow(camera,now){this.sky.position.copy(camera.position);this.clouds.position.copy(camera.position);
  const night=1-smooth(-10,-2,Math.asin(this.dir.y)/RAD);if(now-this.lampAt>.5){this.lampAt=now;const near=LAMPS.map(l=>({l,d:(l.x-camera.position.x)**2+(l.z-camera.position.z)**2})).sort((a,b)=>a.d-b.d).slice(0,this.lamps.length);
   near.forEach((n,i)=>this.lamps[i].position.set(n.l.x,4.2,n.l.z));}for(const l of this.lamps)l.intensity=night*55;}}
