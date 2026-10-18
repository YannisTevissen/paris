import {initStunts,updateStance,finishStance,tryRailCapture,stepRail,exitRail} from './stunts.js';
// Fixed-step vehicle model. Metres, seconds, radians; 120 Hz integration.
// Overdrive tuning (v7): arcade street speeds, about 50 km/h cruise and 94 km/h on nitro.
export const TUNE={cruise:14,boost:26,reverse:-4,accel:6.5,boostAccel:10,brake:9,coast:5,drag:.0034,rolling:.12,grip:13,steerLow:1.7,steerHigh:.2,steerFalloff:12};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapped=a=>Math.atan2(Math.sin(a),Math.cos(a));
export function createVehicle(){return initStunts({x:0,y:0,z:26,vx:0,vz:0,vy:0,yaw:Math.PI,yawRate:0,grounded:true,nitro:100,pitch:0,roll:0,suspension:0,springVelocity:0,airTime:0,spin:0,flip:0,flipping:false,boost:false,impact:0,slip:0,health:100,state:'riding',crashTimer:0,crashPitch:0,crashRoll:0,crashAngular:0,damageCooldown:0,lastDamage:0,hitId:0,crashId:0,cause:'',peakHeight:0});}
export function jumpVehicle(s){if(s.rail&&s.state==='riding'){exitRail(s,'jump',true);return true;}if(s.grounded&&s.state==='riding'){finishStance(s);s.vy=3.8+Math.max(0,s.vy)*.2;s.grounded=false;s.airTime=0;s.spin=0;s.flip=0;s.flipping=false;s.peakHeight=s.y;return true}return false}
// Air flip: once airborne, rotate one full turn (front +1, back -1); pressing again adds a turn.
// Landing before the turn is complete counts as a misaligned landing.
export function flipVehicle(s,dir){if(s.grounded||s.state!=='riding'||s.rail)return false;s.flipTarget=(s.flipping?s.flipTarget:s.tiltPitch)+dir*Math.PI*2;s.flipping=true;return true;}
export function hurtVehicle(s,damage,cause,fall=false,side=1){if(s.state==='dead'||s.damageCooldown>0)return;s.health=clamp(s.health-damage,0,100);s.lastDamage=damage;s.cause=cause;s.hitId++;s.damageCooldown=.4;if(s.health<=0||fall){finishStance(s,false);if(s.rail)exitRail(s,'fall');s.state=s.health<=0?'dead':'fallen';s.boost=false;s.crashTimer=0;s.crashId++;s.crashAngular=side*(2+Math.min(damage/20,3));s.crashPitch=s.pitch+s.tiltPitch;s.crashRoll=s.roll+s.tiltRoll;s.vy=Math.max(s.vy,1);s.grounded=false;}}
function floorGradient(terrain,x,z,dx,dz){const h=terrain(x,z),a=terrain(x+dx,z+dz),b=terrain(x-dx,z-dz);if(Math.abs(a-h)>.3||Math.abs(b-h)>.3)return 0;return clamp((a-b)/Math.hypot(dx*2,dz*2),-1.5,1.5);}
function contact(s,o){if(o.soft||o.railId&&o.railId===s.lastRailId&&s.railCooldown>0)return null;if(o.oneSided){const axis=o.oneSided,side=o.side,velocity=axis==='x'?s.vx:s.vz;if((s[axis]-o[axis])*side<0||velocity*side>=0)return null;}const radius=.5,minY=o.minY??0,top=o.railId?(o.h-.12):(o.h??35);if(s.y>=top-.04||s.y+1.5<=minY)return null;const nx=clamp(s.x,o.x-o.w/2,o.x+o.w/2),nz=clamp(s.z,o.z-o.d/2,o.z+o.d/2);let dx=s.x-nx,dz=s.z-nz,d=Math.hypot(dx,dz);if(d>=radius)return null;
 if(d<.00001){const penX=o.w/2-Math.abs(s.x-o.x),penZ=o.d/2-Math.abs(s.z-o.z);if(penX<penZ){dx=Math.sign(s.x-o.x)||1;dz=0;d=-penX}else{dx=0;dz=Math.sign(s.z-o.z)||1;d=-penZ}}else{dx/=d;dz/=d;}s.x+=dx*(radius-d+.001);s.z+=dz*(radius-d+.001);const vn=s.vx*dx+s.vz*dz;if(vn<0){s.vx-=dx*vn*1.08;s.vz-=dz*vn*1.08;return {speed:-vn,nx:dx,nz:dz}}return null;}
export function stepVehicle(s,input,dt,terrain,obstacles=[],rails=[]){
 let landed=null;s.railCooldown=Math.max(0,s.railCooldown-dt);s.damageCooldown=Math.max(0,s.damageCooldown-dt);
 if(s.state!=='riding'){
  s.crashTimer+=dt;s.vy-=9.81*dt;s.x+=s.vx*dt;s.z+=s.vz*dt;s.y+=s.vy*dt;
  const floor=terrain(s.x,s.z);if(s.y<floor){s.y=floor;s.vy=Math.abs(s.vy)>.8?-s.vy*.16:0;s.vx*=Math.exp(-dt*4);s.vz*=Math.exp(-dt*4);s.crashAngular*=Math.exp(-dt*5);}else{s.crashAngular*=Math.exp(-dt*.5)}
  s.crashPitch+=s.crashAngular*dt;s.crashRoll+=(Math.sign(s.crashAngular)*1.25-s.crashRoll)*(1-Math.exp(-dt*3));
  for(const o of obstacles)contact(s,o);s.x=clamp(s.x,-123,123);s.z=clamp(s.z,-120,120);return null;
 }
 if(s.rail||tryRailCapture(s,input,rails,dt)){const onRail=stepRail(s,input,dt);if(onRail==='fall')hurtVehicle(s,25,'Lost balance on rail',true,Math.sign(s.railBalance)||1);if(onRail)return null;}
 const fx=Math.sin(s.yaw),fz=Math.cos(s.yaw),rx=Math.cos(s.yaw),rz=-Math.sin(s.yaw);
 let longitudinal=s.vx*fx+s.vz*fz,lateral=s.vx*rx+s.vz*rz;const magnitude=Math.hypot(s.vx,s.vz),oldX=s.x,oldZ=s.z,oldY=s.y,oldFloor=terrain(s.x,s.z);
 const slopeX=floorGradient(terrain,s.x,s.z,.12,0),slopeZ=floorGradient(terrain,s.x,s.z,0,.12);
 s.boost=!!(input.boost&&input.throttle>0&&s.nitro>1&&s.grounded);s.nitro=clamp(s.nitro+(s.boost?-22:10)*dt,0,100);
 let acceleration=0;
 if(s.grounded){
  // Proportional like a power-chair joystick: half stick, half speed. Keys give full stick.
  const stick=clamp(input.throttle||0,-1,1),target=stick>0?(s.boost?TUNE.boost:TUNE.cruise)*stick:stick<0?TUNE.reverse*-stick:0;
  const previous=longitudinal;
  // Easing the stick coasts down to the new speed; pulling back past centre brakes.
  const braking=input.throttle<0&&longitudinal>.5?TUNE.brake:input.throttle>0?(longitudinal>target+.3?TUNE.coast:TUNE.brake):TUNE.coast;const drive=clamp(clamp((target-longitudinal)*1.4,-braking,s.boost?TUNE.boostAccel:TUNE.accel)+(slopeX*fx+slopeZ*fz)*9.81,-12,12);
  const surface=input.surface||{grip:1,rolling:0};const rolling=Math.sign(longitudinal)*Math.min(Math.abs(longitudinal)/dt,TUNE.rolling+surface.rolling+TUNE.drag*longitudinal*longitudinal);
  // Balance frees the motor brake so a manual can coast on its existing momentum.
  longitudinal+=((input.balance?0:drive)-rolling)*dt;
  // Turning hard at speed breaks the rear loose: less side grip and some oversteer make a drift.
  const smooth01=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};s.drift=smooth01((magnitude-6.5)/4.5)*smooth01((Math.abs(input.steer||0)-.35)/.55);
  const grip=TUNE.grip*surface.grip*Math.max(.45,Math.cos(s.tiltRoll)*Math.cos(s.tiltPitch))*(1-.5*s.drift);
  lateral-=clamp(lateral*10,-grip,grip)*dt;
  s.vx=fx*longitudinal+rx*lateral-slopeX*9.81*dt;s.vz=fz*longitudinal+rz*lateral-slopeZ*9.81*dt;
  acceleration=(s.vx*fx+s.vz*fz-previous)/dt;
 }
 if(!s.grounded)s.drift=0;const desiredYaw=(input.balance?0:input.steer)*(s.grounded?Math.min(TUNE.steerLow,TUNE.steerFalloff/(magnitude+3)+TUNE.steerHigh)*(1+.7*(s.drift||0)):0)*(longitudinal<-.2?-1:1);if(s.grounded)s.yawRate+=(desiredYaw-s.yawRate)*(1-Math.exp(-dt*7));if(s.grounded)s.yaw+=s.yawRate*dt;s.slip=Math.abs(lateral);s.x+=s.vx*dt;s.z+=s.vz*dt;
 for(let iteration=0;iteration<2;iteration++)for(const o of obstacles){const hit=contact(s,o);if(hit){s.springVelocity-=Math.min(hit.speed*.2,2);if(s.grounded)s.yawRate=clamp(s.yawRate+(hit.nx*rx+hit.nz*rz)*hit.speed*.28,-4,4);if(hit.speed>6)hurtVehicle(s,Math.pow(hit.speed-6,1.5)*1.6,o.label||'Collision',hit.speed>15,Math.sign(hit.nx*fz-hit.nz*fx)||1);}}
 if(s.state!=='riding')return null;
 let floor=terrain(s.x,s.z);
 if(s.grounded){if(floor-oldFloor>.22&&!(terrain.smooth&&terrain.smooth(s.x,s.z))){s.x=oldX;s.z=oldZ;s.vx*=-.08;s.vz*=-.08;floor=oldFloor;s.springVelocity-=1;if(magnitude>7)hurtVehicle(s,Math.pow(magnitude-7,1.4)*2.2,'Hit a ledge',magnitude>17);}
 else if(oldFloor-floor>.12){s.grounded=false;s.vy=clamp(s.vy,0,12);s.airTime=0;s.spin=0;s.flip=0;s.flipping=false;s.peakHeight=s.y;}
 if(s.grounded){s.y=floor;s.vy=clamp((floor-oldFloor)/dt,-12,12);const ahead=terrain(s.x+fx*.45,s.z+fz*.45),behind=terrain(s.x-fx*.45,s.z-fz*.45);const pitch=Math.abs(ahead-behind)<1?-Math.atan2(ahead-behind,.9):s.pitch;s.pitch+=(pitch-s.pitch)*(1-Math.exp(-dt*14));}}
 if(!s.grounded){s.airTime+=dt;s.vy-=9.81*dt;s.y+=s.vy*dt;s.peakHeight=Math.max(s.peakHeight,s.y);s.spin+=s.yawRate*dt;
  // A solid side cannot teleport a falling chair onto its upper surface.
  if(floor>oldY+.25){s.x=oldX;s.z=oldZ;s.vx*=-.1;s.vz*=-.1;floor=terrain(s.x,s.z);if(magnitude>8)hurtVehicle(s,Math.pow(magnitude-8,1.5)*2,'Ramp side impact',magnitude>16);}
  if(s.state==='riding'&&s.y<=floor&&s.vy<=0){s.y=floor;s.grounded=true;s.impact=-s.vy;const landingPitch=wrapped(s.tiltPitch),landingRoll=wrapped(s.tiltRoll),facing=s.yaw+s.spin,landingSideSpeed=Math.abs(s.vx*Math.cos(facing)-s.vz*Math.sin(facing));const misaligned=Math.abs(landingPitch)>.55||Math.abs(landingRoll)>.5;const hard=s.impact>14;
   let damage=hard?Math.pow(s.impact-13,1.6)*3.5:0;if(misaligned)damage+=25+Math.max(Math.abs(landingPitch),Math.abs(landingRoll))*16;if(landingSideSpeed>12)damage+=(landingSideSpeed-12)*4;
   if(damage>0)hurtVehicle(s,damage,misaligned?'Unbalanced landing':hard?'Heavy fall':'Sideways landing',misaligned||s.impact>19||landingSideSpeed>18,Math.sign(landingPitch)||1);
   const retention=clamp(1-Math.max(0,s.impact-4)*.025,.68,1);s.vx*=retention;s.vz*=retention;s.vy=0;s.springVelocity=-Math.min(s.impact*.45,3.4);landed={duration:s.airTime,spin:s.spin,flip:s.tiltPitch,impact:s.impact,clean:s.state==='riding'&&!misaligned};s.yaw+=s.spin;s.spin=0;s.flip=0;s.flipping=false;s.tiltPitch=landingPitch;s.tiltRoll=landingRoll;if(!misaligned){s.pitchVelocity*=.35;s.rollVelocity*=.35;}
  }
 }
 s.springVelocity+=(-95*s.suspension-15*s.springVelocity)*dt;s.suspension=clamp(s.suspension+s.springVelocity*dt,-.16,.12);s.roll=0;
 if(updateStance(s,input,dt,acceleration))hurtVehicle(s,22,'Tipped beyond balance',true,Math.sign(s.tiltRoll||s.tiltPitch)||1);
 if(s.grounded&&magnitude<.06&&!input.throttle)s.vx=s.vz=0;
 if(Math.abs(s.x)>126||Math.abs(s.z)>126||s.y< -10)hurtVehicle(s,100,'Outside the city',true);return landed;
}
