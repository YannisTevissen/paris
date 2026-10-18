import * as THREE from './vendor/three.module.js';
import {RGBELoader} from './vendor/render-addons.js';
import {EffectComposer} from './vendor/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/jsm/postprocessing/RenderPass.js';
import {GTAOPass} from './vendor/jsm/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from './vendor/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from './vendor/jsm/postprocessing/ShaderPass.js';
import {SMAAPass} from './vendor/jsm/postprocessing/SMAAPass.js';
import {GroundReflection} from './reflections.js';
// Camera-like finish after tone mapping: split toning, lens fringe, vignette, grain, and a
// radial zoom smear while the nitro is lit.
const GradeShader={uniforms:{tDiffuse:{value:null},time:{value:0},boost:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float time,boost;varying vec2 vUv;
 float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec2 d=vUv-.5;float r=dot(d,d);float ca=.012+boost*.03;vec3 c=vec3(texture2D(tDiffuse,vUv-d*r*ca).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv+d*r*ca).b);
  if(boost>.01){vec3 acc=c;float k=boost*.045*smoothstep(.02,.25,r);for(int i=1;i<7;i++){acc+=texture2D(tDiffuse,vUv-d*k*float(i)/6.).rgb;}c=acc/7.;}
  float l=dot(c,vec3(.2126,.7152,.0722));c*=mix(vec3(.96,1.,1.05),vec3(1.05,1.,.93),smoothstep(.12,.75,l));
  c=mix(vec3(l),c,1.07);c=c+(c-.5)*.05*(1.-abs(c-.5)*2.);c*=1.-r*(.62+boost*.35);
  c+=(h(vUv*731.+fract(time)*61.)-.5)*.016;gl_FragColor=vec4(clamp(c,0.,1.),1.);}`};
// Camera motion blur from the depth buffer and last frame's view-projection; the chair and
// anything within a few metres of the lens stay sharp.
const MotionBlurShader={uniforms:{tDiffuse:{value:null},tDepth:{value:null},invViewProj:{value:new THREE.Matrix4()},prevViewProj:{value:new THREE.Matrix4()},strength:{value:0},near:{value:.15},far:{value:3200}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`#include <packing>
 uniform sampler2D tDiffuse,tDepth;uniform mat4 invViewProj,prevViewProj;uniform float strength,near,far;varying vec2 vUv;
 void main(){vec4 base=texture2D(tDiffuse,vUv);if(strength<.002){gl_FragColor=base;return;}
  float d=min(texture2D(tDepth,vUv).x,.99995);vec4 w=invViewProj*vec4(vUv*2.-1.,d*2.-1.,1.);w/=w.w;vec4 p=prevViewProj*w;vec2 prev=p.xy/p.w*.5+.5;
  vec2 vel=(vUv-prev)*strength*smoothstep(4.5,15.,-perspectiveDepthToViewZ(d,near,far));float len=length(vel);if(len>.045)vel*=.045/len;
  vec3 c=base.rgb;for(int i=1;i<10;i++)c+=texture2D(tDiffuse,vUv+vel*(float(i)/9.-.5)).rgb;gl_FragColor=vec4(c/10.,base.a);}`};
// Crepuscular rays: bright, unoccluded sky is smeared towards the sun's screen position, so
// light shafts pour between facades, trees and the tower at golden hour.
const GodRayShader={uniforms:{tDiffuse:{value:null},tDepth:{value:null},sunUv:{value:new THREE.Vector2(.5,.5)},strength:{value:0},tint:{value:new THREE.Color(1,.74,.48)}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse,tDepth;uniform vec2 sunUv;uniform float strength;uniform vec3 tint;varying vec2 vUv;
 float sky(vec2 uv){if(uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return 0.;float d=texture2D(tDepth,uv).x;float l=dot(texture2D(tDiffuse,uv).rgb,vec3(.2126,.7152,.0722));return step(.99995,d)*smoothstep(.7,3.2,l);}
 void main(){vec4 base=texture2D(tDiffuse,vUv);if(strength<.001){gl_FragColor=base;return;}vec2 step=(vUv-sunUv)*(.9/34.);vec2 uv=vUv;float light=0.,decay=1.;
  for(int i=0;i<34;i++){uv-=step;light+=sky(uv)*decay;decay*=.962;}gl_FragColor=vec4(base.rgb+tint*light/34.*strength,base.a);}`};
export class Visuals{
 constructor(renderer,scene,camera){this.renderer=renderer;this.scene=scene;this.camera=camera;this.photo=false;this.tracer=null;this.loading=false;this.maxRatio=Math.min(devicePixelRatio,1.5);this.ratio=Math.min(this.maxRatio,1.25);this.frameMs=16;this.lastAdjust=performance.now();
  this.composer=new EffectComposer(renderer);this.composer.addPass(new RenderPass(scene,camera));
  this.ao=new GTAOPass(scene,camera,innerWidth,innerHeight);this.ao.blendIntensity=.95;this.ao.updateGtaoMaterial({radius:.85,distanceExponent:1.4,thickness:1.4,scale:1.15,samples:12,distanceFallOff:1,screenSpaceRadius:false});this.ao.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:5,radiusExponent:1,rings:2,samples:12});
  // Cut-out foliage, railings and decals would print solid quads into the AO buffer.
  const base=this.ao.overrideVisibility.bind(this.ao);this.ao.overrideVisibility=()=>{base();scene.traverse(o=>{if(o.name==='real-paris'||(o.isMesh||o.isSprite)&&(o.material.alphaTest>0||o.material.transparent||o.material.alphaMap))o.visible=false;});};
  // AO is low frequency: compute it at half resolution and let the blend upsample it.
  const aoSize=this.ao.setSize.bind(this.ao);this.ao.setSize=(w,h)=>aoSize(Math.max(1,Math.round(w*.5)),Math.max(1,Math.round(h*.5)));
  this.composer.addPass(this.ao);this.blur=new ShaderPass(MotionBlurShader);this.blur.uniforms.tDepth.value=this.ao.depthTexture;this.composer.addPass(this.blur);this.prevViewProj=new THREE.Matrix4();this.viewProj=new THREE.Matrix4();this.speedBlur=0;this.boost=0;
  this.reflection=new GroundReflection(renderer,scene,camera,.5);renderer.shadowMap.autoUpdate=false;
  this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.28,.6,1.15);this.composer.addPass(this.bloom);this.rays=new ShaderPass(GodRayShader);this.rays.uniforms.tDepth.value=this.ao.depthTexture;this.composer.addPass(this.rays);this.sunWorld=new THREE.Vector3();this.camForward=new THREE.Vector3();
  this.composer.addPass(new OutputPass());this.grade=new ShaderPass(GradeShader);this.composer.addPass(this.grade);this.smaa=new SMAAPass(innerWidth,innerHeight);this.composer.addPass(this.smaa);
  this.sunDirection=new THREE.Vector3(.79,.034,.61).normalize();this.resize();}
 async init(){try{const hdr=await new RGBELoader().loadAsync('./assets/sky.hdr');hdr.mapping=THREE.EquirectangularReflectionMapping;this.scene.environment=hdr;this.scene.background=hdr;this.scene.environmentIntensity=.5;this.scene.backgroundIntensity=.9;this.scene.backgroundBlurriness=.02;this.sunDirection=findSun(hdr)||this.sunDirection;}catch(e){console.warn('HDR lighting unavailable',e);} }
 resize(){this.renderer.setPixelRatio(this.ratio);this.composer.setPixelRatio(this.ratio);this.composer.setSize(innerWidth,innerHeight);this.reflection.setSize(innerWidth,innerHeight,this.ratio);this.blur.uniforms.tDepth.value=this.ao.depthTexture;if(this.rays)this.rays.uniforms.tDepth.value=this.ao.depthTexture;if(this.tracer){this.tracer.updateCamera();this.tracer.reset();}}
 // Hold frame rate by trading resolution, within [0.7, device ratio].
 adapt(dt){if(dt>.05)return;this.frameMs=this.frameMs*.94+dt*1000*.06;const now=performance.now();if(now-this.lastAdjust<1500)return;this.lastAdjust=now;let next=this.ratio;
  // Vsync pins frame time at the refresh interval, so "holding 60" counts as headroom; a level that
  // failed right after a raise becomes the ceiling, which stops the resolution from oscillating.
  if(this.frameMs>20.5){next=Math.max(.7,this.ratio-.1);if(now-(this.raisedAt||0)<6000)this.ceiling=this.ratio-.05;this.good=0;}
  else if(this.frameMs<17.4){this.good=(this.good||0)+1;if(this.good>=3){next=Math.min(this.maxRatio,this.ceiling??this.maxRatio,this.ratio+.1);this.good=0;if(next>this.ratio)this.raisedAt=now;}}else this.good=0;
  if(Math.abs(next-this.ratio)>.01){this.ratio=next;this.resize();}}
 async enterPhoto(status){this.loading=true;status('Preparing ray-traced scene…');try{if(!this.renderer.extensions.has('EXT_color_buffer_float'))throw new Error('This graphics device does not support the required floating-point render targets.');const {WebGLPathTracer}=await import('./vendor/pathtracer.js');if(!this.tracer){this.tracer=new WebGLPathTracer(this.renderer);this.tracer.bounces=3;this.tracer.tiles.set(3,3);this.tracer.textureSize.set(512,512);this.tracer.renderScale=.8;this.tracer.filteredGlossyFactor=.5;this.tracer.minSamples=1;this.tracer.renderDelay=0;this.tracer.fadeDuration=100;}
 const snapshot=this.scene.clone(true);const remove=[];snapshot.traverse(o=>{if(!o.visible||(o.isMesh&&!o.material.isMeshStandardMaterial&&!o.material.isMeshPhysicalMaterial)||(o.isMesh&&o.userData.far))remove.push(o)});remove.forEach(o=>o.removeFromParent());snapshot.fog=null;snapshot.updateMatrixWorld(true);this.tracer.setScene(snapshot,this.camera);this.photo=true;this.loading=false;status('Ray tracing · refining light and reflections');return true;
 }catch(e){this.loading=false;this.photo=false;status('Ray tracing unavailable: '+e.message);return false;}}
 exitPhoto(){this.photo=false;this.loading=false;this.renderer.setRenderTarget(null);this.renderer.autoClear=true;this.renderer.shadowMap.needsUpdate=true;}
 render(status,dt=0){if(this.photo){this.renderer.shadowMap.needsUpdate=true;this.tracer.renderSample();status(Math.floor(this.tracer.samples)+' samples · path traced · P to return');return;}
  this.grade.uniforms.time.value=performance.now()*.001;this.grade.uniforms.boost.value=this.boost;
  const cam=this.camera;cam.updateMatrixWorld();this.viewProj.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);const u=this.blur.uniforms;u.invViewProj.value.copy(this.viewProj).invert();u.prevViewProj.value.copy(this.prevViewProj);u.near.value=cam.near;u.far.value=cam.far;
  // Blur length is a fixed shutter, so it does not grow when the frame rate drops.
  u.strength.value=this.speedBlur*Math.min(1.6,(1/60)/Math.max(dt,1/240));this.blur.enabled=this.speedBlur>.002;
  // Rays come from the HDRI's own sun (low on the horizon), where the sky glow actually is.
  cam.getWorldDirection(this.camForward);const facing=this.camForward.dot(this.sunDirection);this.sunWorld.copy(cam.position).addScaledVector(this.sunDirection,1000).project(cam);
  this.rays.uniforms.sunUv.value.set(this.sunWorld.x*.5+.5,this.sunWorld.y*.5+.5);this.rays.uniforms.strength.value=(facing>0?THREE.MathUtils.smoothstep(facing,.15,.8)*.95:0)*(this.raysScale??1);this.rays.enabled=this.rays.uniforms.strength.value>.01;
  this.reflection.update();this.renderer.shadowMap.needsUpdate=true;this.composer.render(dt);this.prevViewProj.copy(this.viewProj);}
}
// Brightest texel of the equirectangular HDR gives the sun direction (three.js convention).
function findSun(tex){const img=tex.image;if(!img||!img.data)return null;const {data,width,height}=img;const half=data instanceof Uint16Array;const read=i=>half?THREE.DataUtils.fromHalfFloat(data[i]):data[i];let best=-1,bx=0,by=0;for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=2){const i=(y*width+x)*4;const l=read(i)*.2126+read(i+1)*.7152+read(i+2)*.0722;if(l>best){best=l;bx=x;by=y;}}
 const u=(bx+.5)/width,v=(by+.5)/height;const phi=(u-.5)*Math.PI*2;const elevation=(tex.flipY?(.5-v):(v-.5))*Math.PI;return new THREE.Vector3(Math.cos(elevation)*Math.cos(phi),Math.sin(elevation),Math.cos(elevation)*Math.sin(phi)).normalize();}
