import * as THREE from './vendor/three.module.js';
// Drifting cloud shadows: the sun's direct light is dimmed by a slowly moving noise field in world
// space, inside three's shared lighting chunk, so every lit surface darkens consistently while the
// sky's ambient light is untouched.
export const cloudUniform={value:0};
const CLOUD=`uniform float cloudTime;
float cloudHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float cloudNoise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(cloudHash(i),cloudHash(i+vec2(1,0)),u.x),mix(cloudHash(i+vec2(0,1)),cloudHash(i+vec2(1,1)),u.x),u.y);}
float cloudShade(vec3 viewPos){vec3 world=cameraPosition+transpose(mat3(viewMatrix))*viewPos;vec2 p=world.xz/70.+vec2(cloudTime*.03,cloudTime*.012);
 float n=cloudNoise(p)*.55+cloudNoise(p*2.13+5.2)*.3+cloudNoise(p*4.37+1.7)*.15;return mix(.3,1.,smoothstep(.44,.58,n));}
`;
THREE.ShaderChunk.lights_pars_begin=THREE.ShaderChunk.lights_pars_begin.replace('#if NUM_DIR_LIGHTS > 0',CLOUD+'#if NUM_DIR_LIGHTS > 0');
THREE.ShaderChunk.lights_fragment_begin=THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= cloudShade( geometryPosition );');
// Hand the shared time uniform to every material in the scene before its first compile.
export function applyClouds(scene){scene.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.userData.clouds)continue;m.userData.clouds=true;const prev=m.onBeforeCompile;m.onBeforeCompile=function(shader,renderer){prev.call(this,shader,renderer);shader.uniforms.cloudTime=cloudUniform;};}});}
