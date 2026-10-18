import * as THREE from './vendor/three.module.js';
export class CrashRider{
 constructor(scene,materials){this.group=new THREE.Group();scene.add(this.group);this.group.visible=false;
 this.local=[[0,1.69,-.06],[0,1.4,-.11],[0,.97,-.02],[-.13,.93,.42],[.13,.93,.42],[-.13,.4,.66],[.13,.4,.66],[-.21,1.43,-.12],[.21,1.43,-.12],[-.27,1.16,-.04],[.27,1.16,-.04],[-.3,1.12,.26],[.3,1.12,.26]];
 this.p=this.local.map(v=>({pos:new THREE.Vector3(...v),prev:new THREE.Vector3(...v)}));
 const links=[[0,1,.05,'skin'],[1,2,.16,'cloth'],[2,3,.075,'pants'],[2,4,.075,'pants'],[3,5,.06,'pants'],[4,6,.06,'pants'],[1,7,.07,'cloth'],[1,8,.07,'cloth'],[7,9,.052,'cloth'],[8,10,.052,'cloth'],[9,11,.042,'cloth'],[10,12,.042,'cloth']];
 this.links=links.map(([a,b,r,kind])=>{const length=this.p[a].pos.distanceTo(this.p[b].pos),mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,length-r),5,12),materials[kind]);mesh.castShadow=true;this.group.add(mesh);return {a,b,length,mesh}});
 this.constraints=this.links.map(l=>[l.a,l.b,l.length]);for(const [a,b]of[[7,8],[7,2],[8,2],[3,4]])this.constraints.push([a,b,this.p[a].pos.distanceTo(this.p[b].pos)]);
 this.head=new THREE.Mesh(new THREE.SphereGeometry(.11,20,16),materials.skin);this.head.scale.set(.9,1.1,1);if(materials.beanie){const cap=new THREE.Mesh(new THREE.SphereGeometry(.118,24,12,0,Math.PI*2,0,Math.PI*.56),materials.beanie);cap.position.y=.02;cap.rotation.x=-.18;this.head.add(cap);}if(materials.lens){const g=new THREE.Mesh(new THREE.TorusGeometry(.108,.016,8,28,Math.PI*.8),materials.lens);g.rotation.set(Math.PI/2,0,Math.PI*.1);g.position.y=.012;g.scale.set(1,1,1.45);this.head.add(g);}this.head.castShadow=true;this.group.add(this.head);this.up=new THREE.Vector3(0,1,0);this.tmp=new THREE.Vector3();
 }
 start(pos,yaw,v){this.group.visible=true;this.local.forEach((l,i)=>{const p=this.p[i];p.pos.set(l[0]*Math.cos(yaw)+l[2]*Math.sin(yaw)+pos.x,l[1]+pos.y,l[2]*Math.cos(yaw)-l[0]*Math.sin(yaw)+pos.z);p.prev.copy(p.pos).addScaledVector(v,-1/120);});this.draw();}
 stop(){this.group.visible=false;}
 step(dt,terrain,obstacles){if(!this.group.visible)return;for(const p of this.p){const vel=p.pos.clone().sub(p.prev).multiplyScalar(.997);p.prev.copy(p.pos);p.pos.add(vel);p.pos.y-=9.81*dt*dt;}
 for(let k=0;k<7;k++){for(const [a,b,length]of this.constraints){const pa=this.p[a].pos,pb=this.p[b].pos;this.tmp.copy(pb).sub(pa);const d=this.tmp.length();if(d>.0001){this.tmp.multiplyScalar((d-length)/d*.5);pa.add(this.tmp);pb.sub(this.tmp);}}
 for(let i=0;i<this.p.length;i++){const p=this.p[i],radius=i===0?.12:.08,floor=terrain(p.pos.x,p.pos.z)+radius;if(p.pos.y<floor){p.pos.y=floor;p.prev.x+=(p.pos.x-p.prev.x)*.25;p.prev.z+=(p.pos.z-p.prev.z)*.25;}for(const o of obstacles){if(p.pos.y-radius>(o.h??35)||p.pos.y+radius<(o.minY??0))continue;const x=THREE.MathUtils.clamp(p.pos.x,o.x-o.w/2,o.x+o.w/2),z=THREE.MathUtils.clamp(p.pos.z,o.z-o.d/2,o.z+o.d/2),dx=p.pos.x-x,dz=p.pos.z-z,d=Math.hypot(dx,dz);if(d>0&&d<radius){p.pos.x+=dx/d*(radius-d);p.pos.z+=dz/d*(radius-d);}}}}
 this.draw();}
 draw(){for(const l of this.links){const a=this.p[l.a].pos,b=this.p[l.b].pos;l.mesh.position.copy(a).add(b).multiplyScalar(.5);this.tmp.copy(b).sub(a);l.mesh.scale.y=this.tmp.length()/l.length;l.mesh.quaternion.setFromUnitVectors(this.up,this.tmp.normalize());}this.head.position.copy(this.p[0].pos);this.head.quaternion.setFromUnitVectors(this.up,this.tmp.copy(this.p[0].pos).sub(this.p[1].pos).normalize());}
}
