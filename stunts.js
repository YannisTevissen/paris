// Reduced rigid-body balance model: support edges, angular momentum and gravity.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const STANCE_NAMES={wheelie:'REAR WHEELIE',nose:'FRONT-WHEEL MANUAL',left:'LEFT BALANCE',right:'RIGHT BALANCE'};
export function initStunts(s){Object.assign(s,{tiltPitch:0,tiltRoll:0,pitchVelocity:0,rollVelocity:0,weightForward:0,weightSide:0,stance:'',stanceTime:0,stanceDistance:0,stancePoints:0,stanceFinished:null,rail:null,lastRailId:null,railSpeed:0,railTime:0,railDistance:0,railCooldown:0,railFinished:null,railBalance:0});return s;}
export function finishStance(s,clean=true){if(s.stance&&s.stanceTime>.25&&s.stanceDistance>.5)s.stanceFinished={name:STANCE_NAMES[s.stance],points:clean?Math.round(s.stancePoints):0,duration:s.stanceTime,distance:s.stanceDistance,clean};s.stance='';s.stanceTime=0;s.stanceDistance=0;s.stancePoints=0;}
// The ground supplies a reaction until the applied moment lifts a support edge.
// Above that edge gravity either restores the chair or accelerates a tip-over.
function axisStep(angle,velocity,shift,positiveEdge,negativeEdge,dt){
 const sign=Math.abs(angle)>.00001?Math.sign(angle):Math.sign(shift),edge=sign>0?positiveEdge:negativeEdge;
 if(Math.abs(angle)<.00001&&Math.abs(shift)<=edge)return [0,0];
 const torque=9.81*(.92*Math.sin(angle)-sign*edge*Math.cos(angle)+shift);
 velocity+=(torque/1.15-velocity*1.8)*dt;
 const next=angle+velocity*dt;
 if(next*sign<0)return [0,0];
 return [next,velocity];
}
export function updateStance(s,input,dt,acceleration=0){
 if(s.state!=='riding'||s.rail)return;
 const response=1-Math.exp(-dt*7);
 s.weightForward+=((input.balance?input.leanForward||0:0)-s.weightForward)*response;
 s.weightSide+=((input.balance?input.leanSide||0:0)-s.weightSide)*response;
 if(s.grounded){
  const longitudinalShift=s.weightForward*(s.weightForward>0?1.04:.74)-clamp(acceleration,-4.2,4.2)*.92/9.81;
  const long=s.vx*Math.sin(s.yaw)+s.vz*Math.cos(s.yaw),cornering=s.yawRate*long;
  [s.tiltPitch,s.pitchVelocity]=axisStep(s.tiltPitch,s.pitchVelocity,longitudinalShift,.87,.55,dt);
  if(input.balance||Math.abs(s.tiltRoll)>.5){const sidewaysShift=s.weightSide*.77+clamp(cornering,-4,4)*.92/9.81;[s.tiltRoll,s.rollVelocity]=axisStep(s.tiltRoll,s.rollVelocity,sidewaysShift,.59,.59,dt);}
  else{
   // Fast cornering lifts the inside wheels into a controlled two-wheel drift (up to about 17 degrees);
   // the chair settles back as the turn eases. Only an added E lean can take it past the tipping point.
   const lift=Math.sign(cornering)*clamp((Math.abs(cornering)-6.5)*.07,0,.3);
   s.rollVelocity+=((lift-s.tiltRoll)*38-s.rollVelocity*9)*dt;s.tiltRoll+=s.rollVelocity*dt;if(!lift&&Math.abs(s.tiltRoll)<.002&&Math.abs(s.rollVelocity)<.02){s.tiltRoll=0;s.rollVelocity=0;}
  }
 }else{
  // No ground contact means no propulsion or instant change of angular momentum.
  if(s.flipping)s.pitchVelocity=clamp((s.flipTarget-s.tiltPitch)*6,-9.5,9.5);
  else s.pitchVelocity+=(s.weightForward*.85-s.pitchVelocity*.15)*dt;
  s.rollVelocity+=(s.weightSide*.65-s.rollVelocity*.15)*dt;
  s.tiltPitch+=s.pitchVelocity*dt;s.tiltRoll+=s.rollVelocity*dt;
 }
 const p=Math.abs(s.tiltPitch),r=Math.abs(s.tiltRoll);
 const stance=s.grounded&&Math.max(p,r)>.09?(p>r?(s.tiltPitch>0?'nose':'wheelie'):(s.tiltRoll>0?'left':'right')):'';
 if(s.stance&&s.stance!==stance)finishStance(s);
 s.stance=stance;
 const speed=Math.hypot(s.vx,s.vz);
 if(stance){s.stanceTime+=dt;s.stanceDistance+=speed*dt;if(speed>.6)s.stancePoints+=dt*90*Math.min(speed/3,2);}
 return s.grounded&&(p>1.05||r>1.05);
}
export function railProjection(rail,x,z){const dx=rail.bx-rail.ax,dz=rail.bz-rail.az,length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length,t=((x-rail.ax)*tx+(z-rail.az)*tz)/length;return {t,length,tx,tz,x:rail.ax+clamp(t,0,1)*dx,z:rail.az+clamp(t,0,1)*dz};}
export function tryRailCapture(s,input,rails,dt=1/120){
 if(s.rail||s.railCooldown>0||s.state!=='riding'||s.grounded||s.vy>0||Math.abs(s.tiltPitch)>.3||Math.abs(s.tiltRoll)>.25)return false;
 for(const rail of rails){const p=railProjection(rail,s.x,s.z),distance=Math.hypot(s.x-p.x,s.z-p.z),targetY=rail.height-.12,along=s.vx*p.tx+s.vz*p.tz,total=Math.hypot(s.vx,s.vz);
  // Catch only when the chassis actually crosses the bar's top this step.
  if(p.t<0||p.t>1||distance>.27||s.y<targetY-.015||s.y+(s.vy-9.81*dt)*dt>targetY||Math.abs(along)<1.2||Math.abs(along)/Math.max(total,.01)<.94)continue;
  finishStance(s);s.rail=rail;s.railSpeed=along;s.railTime=0;s.railDistance=0;s.railBalance=(s.x-p.x)*p.tz-(s.z-p.z)*p.tx;s.railCrossSpeed=s.vx*p.tz-s.vz*p.tx;
  s.y=targetY;s.vy=0;s.vx=p.tx*along;s.vz=p.tz*along;s.grounded=false;s.spin=s.flip=0;s.boost=false;s.tiltPitch=s.tiltRoll=0;s.pitchVelocity=s.rollVelocity=0;return true;
 }return false;
}
export function exitRail(s,reason='end',jump=false){if(!s.rail)return;const clean=reason!=='fall';s.lastRailId=s.rail.id;s.railFinished={name:'RAIL GRIND',points:clean&&s.railTime>.15?Math.round(s.railTime*160+s.railDistance*28):0,duration:s.railTime,distance:s.railDistance,clean};s.rail=null;s.railCooldown=.35;s.vy=jump?3.8:0;s.airTime=0;s.grounded=false;}
export function stepRail(s,input,dt){
 if(!s.rail)return false;const rail=s.rail,p=railProjection(rail,s.x,s.z);s.railTime+=dt;
 // Coulomb sliding friction removes energy; boost cannot propel a chassis on steel.
 s.railSpeed=Math.sign(s.railSpeed)*Math.max(0,Math.abs(s.railSpeed)-1.15*dt);s.railDistance+=Math.abs(s.railSpeed)*dt;
 const lean=input.balance?(input.leanSide||0):(input.steer||0)*.5;
 s.railCrossSpeed+=(lean*1.2+s.railBalance*1.6)*dt;s.railCrossSpeed*=Math.exp(-dt*1.2);s.railBalance+=s.railCrossSpeed*dt;
 s.x+=p.tx*s.railSpeed*dt+p.tz*s.railCrossSpeed*dt;s.z+=p.tz*s.railSpeed*dt-p.tx*s.railCrossSpeed*dt;s.vx=p.tx*s.railSpeed+p.tz*s.railCrossSpeed;s.vz=p.tz*s.railSpeed-p.tx*s.railCrossSpeed;s.vy=0;s.y=rail.height-.12;s.pitch=0;s.roll=s.railBalance*.7;s.nitro=clamp(s.nitro+11*dt,0,100);s.boost=false;
 const after=railProjection(rail,s.x,s.z);if(after.t<0||after.t>1||Math.abs(s.railSpeed)<.1||Math.abs(s.railBalance)>.34){exitRail(s,'end');return true;}return true;
}
