import{Clock as dt,HalfFloatType as gt,NoBlending as vt,Vector2 as Ke,WebGLRenderTarget as Mt}from"./three.module.js";var W={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};import{ShaderMaterial as Qe,UniformsUtils as mt}from"./three.module.js";import{BufferGeometry as ht,Float32BufferAttribute as He,OrthographicCamera as ct,Mesh as ft}from"./three.module.js";var L=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},pt=new ct(-1,1,1,-1,0,1),Le=class extends ht{constructor(){super(),this.setAttribute("position",new He([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new He([0,2,0,0,2,0],2))}},ut=new Le,Q=class{constructor(e){this._mesh=new ft(ut,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,pt)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var ue=class extends L{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof Qe?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=mt.clone(e.uniforms),this.material=new Qe({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new Q(this.material)}render(e,t,s){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=s.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};var re=class extends L{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,s){let a=e.getContext(),i=e.state;i.buffers.color.setMask(!1),i.buffers.depth.setMask(!1),i.buffers.color.setLocked(!0),i.buffers.depth.setLocked(!0);let r,n;this.inverse?(r=0,n=1):(r=1,n=0),i.buffers.stencil.setTest(!0),i.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),i.buffers.stencil.setFunc(a.ALWAYS,r,4294967295),i.buffers.stencil.setClear(n),i.buffers.stencil.setLocked(!0),e.setRenderTarget(s),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),i.buffers.color.setLocked(!1),i.buffers.depth.setLocked(!1),i.buffers.color.setMask(!0),i.buffers.depth.setMask(!0),i.buffers.stencil.setLocked(!1),i.buffers.stencil.setFunc(a.EQUAL,1,4294967295),i.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),i.buffers.stencil.setLocked(!0)}},me=class extends L{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var Be=class{constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){let s=e.getSize(new Ke);this._width=s.width,this._height=s.height,t=new Mt(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:gt}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new ue(W),this.copyPass.material.blending=vt,this.clock=new dt}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());let t=this.renderer.getRenderTarget(),s=!1;for(let a=0,i=this.passes.length;a<i;a++){let r=this.passes[a];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(a),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,s),r.needsSwap){if(s){let n=this.renderer.getContext(),f=this.renderer.state.buffers.stencil;f.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),f.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}re!==void 0&&(r instanceof re?s=!0:r instanceof me&&(s=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){let t=this.renderer.getSize(new Ke);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;let s=this._width*this._pixelRatio,a=this._height*this._pixelRatio;this.renderTarget1.setSize(s,a),this.renderTarget2.setSize(s,a);for(let i=0;i<this.passes.length;i++)this.passes[i].setSize(s,a)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};import{Color as xt}from"./three.module.js";var ze=class extends L{constructor(e,t,s=null,a=null,i=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=s,this.clearColor=a,this.clearAlpha=i,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new xt}render(e,t,s){let a=e.autoClear;e.autoClear=!1;let i,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(i=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:s),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(i),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=a}};import{AddEquation as Ye,Color as _t,CustomBlending as St,DataTexture as wt,DepthTexture as Rt,DstAlphaFactor as Ct,DstColorFactor as Tt,FloatType as Et,HalfFloatType as qe,MathUtils as bt,MeshNormalMaterial as yt,NearestFilter as $e,NoBlending as X,RedFormat as Pt,DepthStencilFormat as Dt,UnsignedInt248Type as At,RepeatWrapping as Je,ShaderMaterial as ge,UniformsUtils as ve,Vector3 as Nt,WebGLRenderTarget as et,ZeroFactor as tt}from"./three.module.js";var de=class{constructor(e=Math){this.grad3=[[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]],this.grad4=[[0,1,1,1],[0,1,1,-1],[0,1,-1,1],[0,1,-1,-1],[0,-1,1,1],[0,-1,1,-1],[0,-1,-1,1],[0,-1,-1,-1],[1,0,1,1],[1,0,1,-1],[1,0,-1,1],[1,0,-1,-1],[-1,0,1,1],[-1,0,1,-1],[-1,0,-1,1],[-1,0,-1,-1],[1,1,0,1],[1,1,0,-1],[1,-1,0,1],[1,-1,0,-1],[-1,1,0,1],[-1,1,0,-1],[-1,-1,0,1],[-1,-1,0,-1],[1,1,1,0],[1,1,-1,0],[1,-1,1,0],[1,-1,-1,0],[-1,1,1,0],[-1,1,-1,0],[-1,-1,1,0],[-1,-1,-1,0]],this.p=[];for(let t=0;t<256;t++)this.p[t]=Math.floor(e.random()*256);this.perm=[];for(let t=0;t<512;t++)this.perm[t]=this.p[t&255];this.simplex=[[0,1,2,3],[0,1,3,2],[0,0,0,0],[0,2,3,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,3,0],[0,2,1,3],[0,0,0,0],[0,3,1,2],[0,3,2,1],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,3,2,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[1,2,0,3],[0,0,0,0],[1,3,0,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,3,0,1],[2,3,1,0],[1,0,2,3],[1,0,3,2],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,3,1],[0,0,0,0],[2,1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[2,0,1,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,0,1,2],[3,0,2,1],[0,0,0,0],[3,1,2,0],[2,1,0,3],[0,0,0,0],[0,0,0,0],[0,0,0,0],[3,1,0,2],[0,0,0,0],[3,2,0,1],[3,2,1,0]]}dot(e,t,s){return e[0]*t+e[1]*s}dot3(e,t,s,a){return e[0]*t+e[1]*s+e[2]*a}dot4(e,t,s,a,i){return e[0]*t+e[1]*s+e[2]*a+e[3]*i}noise(e,t){let s,a,i,r=.5*(Math.sqrt(3)-1),n=(e+t)*r,f=Math.floor(e+n),m=Math.floor(t+n),_=(3-Math.sqrt(3))/6,A=(f+m)*_,w=f-A,b=m-A,d=e-w,D=t-b,x,M;d>D?(x=1,M=0):(x=0,M=1);let T=d-x+_,y=D-M+_,R=d-1+2*_,N=D-1+2*_,F=f&255,E=m&255,o=this.perm[F+this.perm[E]]%12,l=this.perm[F+x+this.perm[E+M]]%12,h=this.perm[F+1+this.perm[E+1]]%12,c=.5-d*d-D*D;c<0?s=0:(c*=c,s=c*c*this.dot(this.grad3[o],d,D));let p=.5-T*T-y*y;p<0?a=0:(p*=p,a=p*p*this.dot(this.grad3[l],T,y));let g=.5-R*R-N*N;return g<0?i=0:(g*=g,i=g*g*this.dot(this.grad3[h],R,N)),70*(s+a+i)}noise3d(e,t,s){let a,i,r,n,m=(e+t+s)*.3333333333333333,_=Math.floor(e+m),A=Math.floor(t+m),w=Math.floor(s+m),b=1/6,d=(_+A+w)*b,D=_-d,x=A-d,M=w-d,T=e-D,y=t-x,R=s-M,N,F,E,o,l,h;T>=y?y>=R?(N=1,F=0,E=0,o=1,l=1,h=0):T>=R?(N=1,F=0,E=0,o=1,l=0,h=1):(N=0,F=0,E=1,o=1,l=0,h=1):y<R?(N=0,F=0,E=1,o=0,l=1,h=1):T<R?(N=0,F=1,E=0,o=0,l=1,h=1):(N=0,F=1,E=0,o=1,l=1,h=0);let c=T-N+b,p=y-F+b,g=R-E+b,u=T-o+2*b,S=y-l+2*b,v=R-h+2*b,B=T-1+3*b,G=y-1+3*b,C=R-1+3*b,k=_&255,O=A&255,U=w&255,I=this.perm[k+this.perm[O+this.perm[U]]]%12,K=this.perm[k+N+this.perm[O+F+this.perm[U+E]]]%12,fe=this.perm[k+o+this.perm[O+l+this.perm[U+h]]]%12,pe=this.perm[k+1+this.perm[O+1+this.perm[U+1]]]%12,j=.6-T*T-y*y-R*R;j<0?a=0:(j*=j,a=j*j*this.dot3(this.grad3[I],T,y,R));let V=.6-c*c-p*p-g*g;V<0?i=0:(V*=V,i=V*V*this.dot3(this.grad3[K],c,p,g));let Z=.6-u*u-S*S-v*v;Z<0?r=0:(Z*=Z,r=Z*Z*this.dot3(this.grad3[fe],u,S,v));let H=.6-B*B-G*G-C*C;return H<0?n=0:(H*=H,n=H*H*this.dot3(this.grad3[pe],B,G,C)),32*(a+i+r+n)}noise4d(e,t,s,a){let i=this.grad4,r=this.simplex,n=this.perm,f=(Math.sqrt(5)-1)/4,m=(5-Math.sqrt(5))/20,_,A,w,b,d,D=(e+t+s+a)*f,x=Math.floor(e+D),M=Math.floor(t+D),T=Math.floor(s+D),y=Math.floor(a+D),R=(x+M+T+y)*m,N=x-R,F=M-R,E=T-R,o=y-R,l=e-N,h=t-F,c=s-E,p=a-o,g=l>h?32:0,u=l>c?16:0,S=h>c?8:0,v=l>p?4:0,B=h>p?2:0,G=c>p?1:0,C=g+u+S+v+B+G,k=r[C][0]>=3?1:0,O=r[C][1]>=3?1:0,U=r[C][2]>=3?1:0,I=r[C][3]>=3?1:0,K=r[C][0]>=2?1:0,fe=r[C][1]>=2?1:0,pe=r[C][2]>=2?1:0,j=r[C][3]>=2?1:0,V=r[C][0]>=1?1:0,Z=r[C][1]>=1?1:0,H=r[C][2]>=1?1:0,Ze=r[C][3]>=1?1:0,Se=l-k+m,we=h-O+m,Re=c-U+m,Ce=p-I+m,Te=l-K+2*m,Ee=h-fe+2*m,be=c-pe+2*m,ye=p-j+2*m,Pe=l-V+3*m,De=h-Z+3*m,Ae=c-H+3*m,Ne=p-Ze+3*m,Fe=l-1+4*m,ke=h-1+4*m,Ue=c-1+4*m,Ie=p-1+4*m,Y=x&255,q=M&255,$=T&255,J=y&255,at=n[Y+n[q+n[$+n[J]]]]%32,rt=n[Y+k+n[q+O+n[$+U+n[J+I]]]]%32,ot=n[Y+K+n[q+fe+n[$+pe+n[J+j]]]]%32,nt=n[Y+V+n[q+Z+n[$+H+n[J+Ze]]]]%32,lt=n[Y+1+n[q+1+n[$+1+n[J+1]]]]%32,ee=.6-l*l-h*h-c*c-p*p;ee<0?_=0:(ee*=ee,_=ee*ee*this.dot4(i[at],l,h,c,p));let te=.6-Se*Se-we*we-Re*Re-Ce*Ce;te<0?A=0:(te*=te,A=te*te*this.dot4(i[rt],Se,we,Re,Ce));let ie=.6-Te*Te-Ee*Ee-be*be-ye*ye;ie<0?w=0:(ie*=ie,w=ie*ie*this.dot4(i[ot],Te,Ee,be,ye));let se=.6-Pe*Pe-De*De-Ae*Ae-Ne*Ne;se<0?b=0:(se*=se,b=se*se*this.dot4(i[nt],Pe,De,Ae,Ne));let ae=.6-Fe*Fe-ke*ke-Ue*Ue-Ie*Ie;return ae<0?d=0:(ae*=ae,d=ae*ae*this.dot4(i[lt],Fe,ke,Ue,Ie)),27*(_+A+w+b+d)}};import{Matrix4 as We,Vector2 as Xe}from"./three.module.js";var oe={name:"SSAOShader",defines:{PERSPECTIVE_CAMERA:1,KERNEL_SIZE:32},uniforms:{tNormal:{value:null},tDepth:{value:null},tNoise:{value:null},kernel:{value:null},cameraNear:{value:null},cameraFar:{value:null},resolution:{value:new Xe},cameraProjectionMatrix:{value:new We},cameraInverseProjectionMatrix:{value:new We},kernelRadius:{value:8},minDistance:{value:.005},maxDistance:{value:.05}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
		uniform highp sampler2D tNormal;
		uniform highp sampler2D tDepth;
		uniform sampler2D tNoise;

		uniform vec3 kernel[ KERNEL_SIZE ];

		uniform vec2 resolution;

		uniform float cameraNear;
		uniform float cameraFar;
		uniform mat4 cameraProjectionMatrix;
		uniform mat4 cameraInverseProjectionMatrix;

		uniform float kernelRadius;
		uniform float minDistance; // avoid artifacts caused by neighbour fragments with minimal depth difference
		uniform float maxDistance; // avoid the influence of fragments which are too far away

		varying vec2 vUv;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {

			return texture2D( tDepth, screenPosition ).x;

		}

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		float getViewZ( const in float depth ) {

			#if PERSPECTIVE_CAMERA == 1

				return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );

			#else

				return orthographicDepthToViewZ( depth, cameraNear, cameraFar );

			#endif

		}

		vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {

			float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];

			vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );

			clipPosition *= clipW; // unprojection.

			return ( cameraInverseProjectionMatrix * clipPosition ).xyz;

		}

		vec3 getViewNormal( const in vec2 screenPosition ) {

			return unpackRGBToNormal( texture2D( tNormal, screenPosition ).xyz );

		}

		void main() {

			float depth = getDepth( vUv );

			if ( depth == 1.0 ) {

				gl_FragColor = vec4( 1.0 ); // don't influence background
				
			} else {

				float viewZ = getViewZ( depth );

				vec3 viewPosition = getViewPosition( vUv, depth, viewZ );
				vec3 viewNormal = getViewNormal( vUv );

				vec2 noiseScale = vec2( resolution.x / 4.0, resolution.y / 4.0 );
				vec3 random = vec3( texture2D( tNoise, vUv * noiseScale ).r );

				// compute matrix used to reorient a kernel vector

				vec3 tangent = normalize( random - viewNormal * dot( random, viewNormal ) );
				vec3 bitangent = cross( viewNormal, tangent );
				mat3 kernelMatrix = mat3( tangent, bitangent, viewNormal );

				float occlusion = 0.0;

				for ( int i = 0; i < KERNEL_SIZE; i ++ ) {

					vec3 sampleVector = kernelMatrix * kernel[ i ]; // reorient sample vector in view space
					vec3 samplePoint = viewPosition + ( sampleVector * kernelRadius ); // calculate sample point

					vec4 samplePointNDC = cameraProjectionMatrix * vec4( samplePoint, 1.0 ); // project point and calculate NDC
					samplePointNDC /= samplePointNDC.w;

					vec2 samplePointUv = samplePointNDC.xy * 0.5 + 0.5; // compute uv coordinates

					float realDepth = getLinearDepth( samplePointUv ); // get linear depth from depth texture
					float sampleDepth = viewZToOrthographicDepth( samplePoint.z, cameraNear, cameraFar ); // compute linear depth of the sample view Z value
					float delta = sampleDepth - realDepth;

					if ( delta > minDistance && delta < maxDistance ) { // if fragment is before sample point, increase occlusion

						occlusion += 1.0;

					}

				}

				occlusion = clamp( occlusion / float( KERNEL_SIZE ), 0.0, 1.0 );

				gl_FragColor = vec4( vec3( 1.0 - occlusion ), 1.0 );

			}

		}`},ne={name:"SSAODepthShader",defines:{PERSPECTIVE_CAMERA:1},uniforms:{tDepth:{value:null},cameraNear:{value:null},cameraFar:{value:null}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;

		varying vec2 vUv;

		#include <packing>

		float getLinearDepth( const in vec2 screenPosition ) {

			#if PERSPECTIVE_CAMERA == 1

				float fragCoordZ = texture2D( tDepth, screenPosition ).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

			#else

				return texture2D( tDepth, screenPosition ).x;

			#endif

		}

		void main() {

			float depth = getLinearDepth( vUv );
			gl_FragColor = vec4( vec3( 1.0 - depth ), 1.0 );

		}`},le={name:"SSAOBlurShader",uniforms:{tDiffuse:{value:null},resolution:{value:new Xe}},vertexShader:`varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`uniform sampler2D tDiffuse;

		uniform vec2 resolution;

		varying vec2 vUv;

		void main() {

			vec2 texelSize = ( 1.0 / resolution );
			float result = 0.0;

			for ( int i = - 2; i <= 2; i ++ ) {

				for ( int j = - 2; j <= 2; j ++ ) {

					vec2 offset = ( vec2( float( i ), float( j ) ) ) * texelSize;
					result += texture2D( tDiffuse, vUv + offset ).r;

				}

			}

			gl_FragColor = vec4( vec3( result / ( 5.0 * 5.0 ) ), 1.0 );

		}`};var Me=class P extends L{constructor(e,t,s,a,i=32){super(),this.width=s!==void 0?s:512,this.height=a!==void 0?a:512,this.clear=!0,this.needsSwap=!1,this.camera=t,this.scene=e,this.kernelRadius=8,this.kernel=[],this.noiseTexture=null,this.output=0,this.minDistance=.005,this.maxDistance=.1,this._visibilityCache=new Map,this.generateSampleKernel(i),this.generateRandomKernelRotations();let r=new Rt;r.format=Dt,r.type=At,this.normalRenderTarget=new et(this.width,this.height,{minFilter:$e,magFilter:$e,type:qe,depthTexture:r}),this.ssaoRenderTarget=new et(this.width,this.height,{type:qe}),this.blurRenderTarget=this.ssaoRenderTarget.clone(),this.ssaoMaterial=new ge({defines:Object.assign({},oe.defines),uniforms:ve.clone(oe.uniforms),vertexShader:oe.vertexShader,fragmentShader:oe.fragmentShader,blending:X}),this.ssaoMaterial.defines.KERNEL_SIZE=i,this.ssaoMaterial.uniforms.tNormal.value=this.normalRenderTarget.texture,this.ssaoMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.ssaoMaterial.uniforms.tNoise.value=this.noiseTexture,this.ssaoMaterial.uniforms.kernel.value=this.kernel,this.ssaoMaterial.uniforms.cameraNear.value=this.camera.near,this.ssaoMaterial.uniforms.cameraFar.value=this.camera.far,this.ssaoMaterial.uniforms.resolution.value.set(this.width,this.height),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.normalMaterial=new yt,this.normalMaterial.blending=X,this.blurMaterial=new ge({defines:Object.assign({},le.defines),uniforms:ve.clone(le.uniforms),vertexShader:le.vertexShader,fragmentShader:le.fragmentShader}),this.blurMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.blurMaterial.uniforms.resolution.value.set(this.width,this.height),this.depthRenderMaterial=new ge({defines:Object.assign({},ne.defines),uniforms:ve.clone(ne.uniforms),vertexShader:ne.vertexShader,fragmentShader:ne.fragmentShader,blending:X}),this.depthRenderMaterial.uniforms.tDepth.value=this.normalRenderTarget.depthTexture,this.depthRenderMaterial.uniforms.cameraNear.value=this.camera.near,this.depthRenderMaterial.uniforms.cameraFar.value=this.camera.far,this.copyMaterial=new ge({uniforms:ve.clone(W.uniforms),vertexShader:W.vertexShader,fragmentShader:W.fragmentShader,transparent:!0,depthTest:!1,depthWrite:!1,blendSrc:Tt,blendDst:tt,blendEquation:Ye,blendSrcAlpha:Ct,blendDstAlpha:tt,blendEquationAlpha:Ye}),this.fsQuad=new Q(null),this.originalClearColor=new _t}dispose(){this.normalRenderTarget.dispose(),this.ssaoRenderTarget.dispose(),this.blurRenderTarget.dispose(),this.normalMaterial.dispose(),this.blurMaterial.dispose(),this.copyMaterial.dispose(),this.depthRenderMaterial.dispose(),this.fsQuad.dispose()}render(e,t,s){switch(this.overrideVisibility(),this.renderOverride(e,this.normalMaterial,this.normalRenderTarget,7829503,1),this.restoreVisibility(),this.ssaoMaterial.uniforms.kernelRadius.value=this.kernelRadius,this.ssaoMaterial.uniforms.minDistance.value=this.minDistance,this.ssaoMaterial.uniforms.maxDistance.value=this.maxDistance,this.renderPass(e,this.ssaoMaterial,this.ssaoRenderTarget),this.renderPass(e,this.blurMaterial,this.blurRenderTarget),this.output){case P.OUTPUT.SSAO:this.copyMaterial.uniforms.tDiffuse.value=this.ssaoRenderTarget.texture,this.copyMaterial.blending=X,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:s);break;case P.OUTPUT.Blur:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=X,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:s);break;case P.OUTPUT.Depth:this.renderPass(e,this.depthRenderMaterial,this.renderToScreen?null:s);break;case P.OUTPUT.Normal:this.copyMaterial.uniforms.tDiffuse.value=this.normalRenderTarget.texture,this.copyMaterial.blending=X,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:s);break;case P.OUTPUT.Default:this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture,this.copyMaterial.blending=St,this.renderPass(e,this.copyMaterial,this.renderToScreen?null:s);break;default:console.warn("THREE.SSAOPass: Unknown output type.")}}renderPass(e,t,s,a,i){e.getClearColor(this.originalClearColor);let r=e.getClearAlpha(),n=e.autoClear;e.setRenderTarget(s),e.autoClear=!1,a!=null&&(e.setClearColor(a),e.setClearAlpha(i||0),e.clear()),this.fsQuad.material=t,this.fsQuad.render(e),e.autoClear=n,e.setClearColor(this.originalClearColor),e.setClearAlpha(r)}renderOverride(e,t,s,a,i){e.getClearColor(this.originalClearColor);let r=e.getClearAlpha(),n=e.autoClear;e.setRenderTarget(s),e.autoClear=!1,a=t.clearColor||a,i=t.clearAlpha||i,a!=null&&(e.setClearColor(a),e.setClearAlpha(i||0),e.clear()),this.scene.overrideMaterial=t,e.render(this.scene,this.camera),this.scene.overrideMaterial=null,e.autoClear=n,e.setClearColor(this.originalClearColor),e.setClearAlpha(r)}setSize(e,t){this.width=e,this.height=t,this.ssaoRenderTarget.setSize(e,t),this.normalRenderTarget.setSize(e,t),this.blurRenderTarget.setSize(e,t),this.ssaoMaterial.uniforms.resolution.value.set(e,t),this.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(this.camera.projectionMatrix),this.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(this.camera.projectionMatrixInverse),this.blurMaterial.uniforms.resolution.value.set(e,t)}generateSampleKernel(e){let t=this.kernel;for(let s=0;s<e;s++){let a=new Nt;a.x=Math.random()*2-1,a.y=Math.random()*2-1,a.z=Math.random(),a.normalize();let i=s/e;i=bt.lerp(.1,1,i*i),a.multiplyScalar(i),t.push(a)}}generateRandomKernelRotations(){let s=new de,a=4*4,i=new Float32Array(a);for(let r=0;r<a;r++){let n=Math.random()*2-1,f=Math.random()*2-1,m=0;i[r]=s.noise3d(n,f,m)}this.noiseTexture=new wt(i,4,4,Pt,Et),this.noiseTexture.wrapS=Je,this.noiseTexture.wrapT=Je,this.noiseTexture.needsUpdate=!0}overrideVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(s){t.set(s,s.visible),(s.isPoints||s.isLine)&&(s.visible=!1)})}restoreVisibility(){let e=this.scene,t=this._visibilityCache;e.traverse(function(s){let a=t.get(s);s.visible=a}),t.clear()}};Me.OUTPUT={Default:0,SSAO:1,Blur:2,Depth:3,Normal:4};import{ColorManagement as Ft,RawShaderMaterial as kt,UniformsUtils as Ut,LinearToneMapping as It,ReinhardToneMapping as Lt,CineonToneMapping as Bt,AgXToneMapping as zt,ACESFilmicToneMapping as Ot,NeutralToneMapping as Gt,SRGBTransfer as jt}from"./three.module.js";var it={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var Oe=class extends L{constructor(){super();let e=it;this.uniforms=Ut.clone(e.uniforms),this.material=new kt({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new Q(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,s){this.uniforms.tDiffuse.value=s.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},Ft.getTransfer(this._outputColorSpace)===jt&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===It?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Lt?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===Bt?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===Ot?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===zt?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===Gt&&(this.material.defines.NEUTRAL_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}};import{DataTextureLoader as Vt,DataUtils as xe,FloatType as Ge,HalfFloatType as _e,LinearFilter as st,LinearSRGBColorSpace as Zt}from"./three.module.js";var je=class extends Vt{constructor(e){super(e),this.type=_e}parse(e){let r=function(o,l){switch(o){case 1:throw new Error("THREE.RGBELoader: Read Error: "+(l||""));case 2:throw new Error("THREE.RGBELoader: Write Error: "+(l||""));case 3:throw new Error("THREE.RGBELoader: Bad File Format: "+(l||""));default:case 4:throw new Error("THREE.RGBELoader: Memory Error: "+(l||""))}},_=`
`,A=function(o,l,h){l=l||1024;let p=o.pos,g=-1,u=0,S="",v=String.fromCharCode.apply(null,new Uint16Array(o.subarray(p,p+128)));for(;0>(g=v.indexOf(_))&&u<l&&p<o.byteLength;)S+=v,u+=v.length,p+=128,v+=String.fromCharCode.apply(null,new Uint16Array(o.subarray(p,p+128)));return-1<g?(h!==!1&&(o.pos+=u+g+1),S+v.slice(0,g)):!1},w=function(o){let l=/^#\?(\S+)/,h=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,c=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,p=/^\s*FORMAT=(\S+)\s*$/,g=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,u={valid:0,string:"",comments:"",programtype:"RGBE",format:"",gamma:1,exposure:1,width:0,height:0},S,v;for((o.pos>=o.byteLength||!(S=A(o)))&&r(1,"no header found"),(v=S.match(l))||r(3,"bad initial token"),u.valid|=1,u.programtype=v[1],u.string+=S+`
`;S=A(o),S!==!1;){if(u.string+=S+`
`,S.charAt(0)==="#"){u.comments+=S+`
`;continue}if((v=S.match(h))&&(u.gamma=parseFloat(v[1])),(v=S.match(c))&&(u.exposure=parseFloat(v[1])),(v=S.match(p))&&(u.valid|=2,u.format=v[1]),(v=S.match(g))&&(u.valid|=4,u.height=parseInt(v[1],10),u.width=parseInt(v[2],10)),u.valid&2&&u.valid&4)break}return u.valid&2||r(3,"missing format specifier"),u.valid&4||r(3,"missing image size specifier"),u},b=function(o,l,h){let c=l;if(c<8||c>32767||o[0]!==2||o[1]!==2||o[2]&128)return new Uint8Array(o);c!==(o[2]<<8|o[3])&&r(3,"wrong scanline width");let p=new Uint8Array(4*l*h);p.length||r(4,"unable to allocate buffer space");let g=0,u=0,S=4*c,v=new Uint8Array(4),B=new Uint8Array(S),G=h;for(;G>0&&u<o.byteLength;){u+4>o.byteLength&&r(1),v[0]=o[u++],v[1]=o[u++],v[2]=o[u++],v[3]=o[u++],(v[0]!=2||v[1]!=2||(v[2]<<8|v[3])!=c)&&r(3,"bad rgbe scanline format");let C=0,k;for(;C<S&&u<o.byteLength;){k=o[u++];let U=k>128;if(U&&(k-=128),(k===0||C+k>S)&&r(3,"bad scanline data"),U){let I=o[u++];for(let K=0;K<k;K++)B[C++]=I}else B.set(o.subarray(u,u+k),C),C+=k,u+=k}let O=c;for(let U=0;U<O;U++){let I=0;p[g]=B[U+I],I+=c,p[g+1]=B[U+I],I+=c,p[g+2]=B[U+I],I+=c,p[g+3]=B[U+I],g+=4}G--}return p},d=function(o,l,h,c){let p=o[l+3],g=Math.pow(2,p-128)/255;h[c+0]=o[l+0]*g,h[c+1]=o[l+1]*g,h[c+2]=o[l+2]*g,h[c+3]=1},D=function(o,l,h,c){let p=o[l+3],g=Math.pow(2,p-128)/255;h[c+0]=xe.toHalfFloat(Math.min(o[l+0]*g,65504)),h[c+1]=xe.toHalfFloat(Math.min(o[l+1]*g,65504)),h[c+2]=xe.toHalfFloat(Math.min(o[l+2]*g,65504)),h[c+3]=xe.toHalfFloat(1)},x=new Uint8Array(e);x.pos=0;let M=w(x),T=M.width,y=M.height,R=b(x.subarray(x.pos),T,y),N,F,E;switch(this.type){case Ge:E=R.length/4;let o=new Float32Array(E*4);for(let h=0;h<E;h++)d(R,h*4,o,h*4);N=o,F=Ge;break;case _e:E=R.length/4;let l=new Uint16Array(E*4);for(let h=0;h<E;h++)D(R,h*4,l,h*4);N=l,F=_e;break;default:throw new Error("THREE.RGBELoader: Unsupported type: "+this.type)}return{width:T,height:y,data:N,header:M.string,gamma:M.gamma,exposure:M.exposure,type:F}}setDataType(e){return this.type=e,this}load(e,t,s,a){function i(r,n){switch(r.type){case Ge:case _e:r.colorSpace=Zt,r.minFilter=st,r.magFilter=st,r.generateMipmaps=!1,r.flipY=!0;break}t&&t(r,n)}return super.load(e,i,s,a)}};import{BoxGeometry as Ht,Vector3 as ce}from"./three.module.js";var he=new ce;function z(P,e,t,s,a,i){let r=2*Math.PI*a/4,n=Math.max(i-2*a,0),f=Math.PI/4;he.copy(e),he[s]=0,he.normalize();let m=.5*r/(r+n),_=1-he.angleTo(P)/f;return Math.sign(he[t])===1?_*m:n/(r+n)+m+m*(1-_)}var Ve=class extends Ht{constructor(e=1,t=1,s=1,a=2,i=.1){if(a=a*2+1,i=Math.min(e/2,t/2,s/2,i),super(1,1,1,a,a,a),a===1)return;let r=this.toNonIndexed();this.index=null,this.attributes.position=r.attributes.position,this.attributes.normal=r.attributes.normal,this.attributes.uv=r.attributes.uv;let n=new ce,f=new ce,m=new ce(e,t,s).divideScalar(2).subScalar(i),_=this.attributes.position.array,A=this.attributes.normal.array,w=this.attributes.uv.array,b=_.length/6,d=new ce,D=.5/a;for(let x=0,M=0;x<_.length;x+=3,M+=2)switch(n.fromArray(_,x),f.copy(n),f.x-=Math.sign(f.x)*D,f.y-=Math.sign(f.y)*D,f.z-=Math.sign(f.z)*D,f.normalize(),_[x+0]=m.x*Math.sign(n.x)+f.x*i,_[x+1]=m.y*Math.sign(n.y)+f.y*i,_[x+2]=m.z*Math.sign(n.z)+f.z*i,A[x+0]=f.x,A[x+1]=f.y,A[x+2]=f.z,Math.floor(x/b)){case 0:d.set(1,0,0),w[M+0]=z(d,f,"z","y",i,s),w[M+1]=1-z(d,f,"y","z",i,t);break;case 1:d.set(-1,0,0),w[M+0]=1-z(d,f,"z","y",i,s),w[M+1]=1-z(d,f,"y","z",i,t);break;case 2:d.set(0,1,0),w[M+0]=1-z(d,f,"x","z",i,e),w[M+1]=z(d,f,"z","x",i,s);break;case 3:d.set(0,-1,0),w[M+0]=1-z(d,f,"x","z",i,e),w[M+1]=1-z(d,f,"z","x",i,s);break;case 4:d.set(0,0,1),w[M+0]=1-z(d,f,"x","y",i,e),w[M+1]=1-z(d,f,"y","x",i,t);break;case 5:d.set(0,0,-1),w[M+0]=z(d,f,"x","y",i,e),w[M+1]=1-z(d,f,"y","x",i,t);break}}};export{Be as EffectComposer,Oe as OutputPass,je as RGBELoader,ze as RenderPass,Ve as RoundedBoxGeometry,Me as SSAOPass};
