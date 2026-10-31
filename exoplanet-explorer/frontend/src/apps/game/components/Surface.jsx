import  { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGame } from '../store/useGame';
import { getShelterSpotsNear, rocksInTerrainBounds, terrainHeight } from '../sim/terrain.js';
import { Player, PlayerOverlay } from './Player.jsx';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function starColor(k = 5772) {
  if (k < 3500) return '#ff592f';
  if (k < 5000) return '#ffb66b';
  if (k < 6500) return '#fff0d0';
  return '#c9ddff';
}
function worldType(planet, sim) {
  if ((planet?.pl_rade ?? 1) > 2.5) return 'giant';
  if ((sim?.T ?? 288) > 700) return 'lava';
  if ((sim?.T ?? 288) > 310) return 'hot';
  if ((sim?.T ?? 288) < 273) return 'cold';
  return 'rocky';
}
function makeTerrain(type, centerX = 0, centerZ = 0) {
  const geo = new THREE.PlaneGeometry(200, 200, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const colors = [];
  const palette = type === 'lava' ? [[.12,.035,.035],[.5,.075,.035],[.95,.24,.035]] : type === 'hot' ? [[.055,.06,.065],[.18,.12,.1],[.34,.19,.13]] : type === 'cold' ? [[.31,.42,.49],[.69,.76,.79],[.91,.94,.91]] : [[.12,.17,.18],[.29,.32,.31],[.49,.37,.3]];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i); const z = pos.getZ(i);
    const h = terrainHeight(centerX + x, centerZ + z, type);
    pos.setY(i, h);
    const n = clamp(.5 + h / (type === 'lava' ? 8 : 5), 0, 1);
    const t = clamp((n + 1) / 2, 0, 1) * 2; const lo = Math.floor(t); const mix = t - lo;
    const a = palette[lo]; const b = palette[Math.min(2, lo + 1)];
    colors.push(a[0] + (b[0]-a[0])*mix, a[1] + (b[1]-a[1])*mix, a[2] + (b[2]-a[2])*mix);
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function Terrain({ type }) {
  const group = useRef(); const mesh = useRef(); const rocks = useRef();
  const center = useRef({ x: Number.NaN, z: Number.NaN }); const geometry = useMemo(() => makeTerrain(type), [type]);
  const cracks = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 36; i++) {
      const x = ((i * 17.31) % 100) - 50; const z = ((i * 9.17) % 100) - 50;
      pts.push(new THREE.Vector3(x, terrainHeight(x, z, type) + .025, z));
      pts.push(new THREE.Vector3(x + Math.sin(i * 4.1) * 1.8, terrainHeight(x + Math.sin(i * 4.1) * 1.8, z - 1.2, type) + .025, z - 1.2 - (i % 4) * .6));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [type]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ camera }) => {
    const cx = Math.round(camera.position.x / 50) * 50; const cz = Math.round(camera.position.z / 50) * 50;
    if (cx === center.current.x && cz === center.current.z) return;
    center.current = { x: cx, z: cz }; group.current.position.set(cx, 0, cz);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(cx + pos.getX(i), cz + pos.getZ(i), type));
    pos.needsUpdate = true; geometry.computeVertexNormals();
    const colors = geometry.attributes.color;
    if (colors) for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i); const n = clamp(.5 + h / (type === 'lava' ? 8 : 5), 0, 1); const t = n * 2; const lo = Math.floor(t); const f = t - lo;
      const palette = type === 'lava' ? [[.12,.035,.035],[.5,.075,.035],[.95,.24,.035]] : type === 'hot' ? [[.055,.06,.065],[.18,.12,.1],[.34,.19,.13]] : type === 'cold' ? [[.31,.42,.49],[.69,.76,.79],[.91,.94,.91]] : [[.12,.17,.18],[.29,.32,.31],[.49,.37,.3]];
      const a = palette[lo]; const b = palette[Math.min(2, lo + 1)]; colors.setXYZ(i, a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f);
    }
    if (colors) colors.needsUpdate = true;
    const crackPositions = cracks.attributes.position;
    for (let i = 0; i < crackPositions.count; i++) crackPositions.setY(i, terrainHeight(cx + crackPositions.getX(i), cz + crackPositions.getZ(i), type) + .025);
    crackPositions.needsUpdate = true;
    rocksInTerrainBounds(cx, cz).forEach((rock, i) => {
      const x = rock.x; const z = rock.z;
      dummy.position.set(x - cx, terrainHeight(x, z, type) + rock.s * .22, z - cz);
      dummy.rotation.set(rock.rot * .2, rock.rot, rock.rot * .15);
      dummy.scale.set(rock.s * 1.1, rock.s * .65, rock.s); dummy.updateMatrix(); rocks.current.setMatrixAt(i, dummy.matrix);
    });
    const shelterSpots = getShelterSpotsNear(cx, cz, 145).slice(0, 10);
    for (let i = 0; i < 40; i++) {
      const spot = shelterSpots[Math.floor(i / 4)];
      if (spot) {
        const offsets = [[-2.2,0],[2.2,0],[0,-2.2],[0,2.2]]; const offset = offsets[i % 4]; const size = 1.2 + (i % 4) * .22;
        const x = spot.x + offset[0]; const z = spot.z + offset[1];
        dummy.position.set(x - cx, terrainHeight(x, z, type) + size * .22, z - cz);
        dummy.rotation.set(.1 * (i % 3), i * 1.7, .08 * (i % 4)); dummy.scale.set(size * 1.2, size * .75, size); dummy.updateMatrix();
      } else { dummy.position.set(0, -1000, 0); dummy.scale.setScalar(0); dummy.updateMatrix(); }
      rocks.current.setMatrixAt(144 + i, dummy.matrix);
    }
    rocks.current.instanceMatrix.needsUpdate = true;
  });
  return <group ref={group}>
    <mesh ref={mesh} geometry={geometry}><meshStandardMaterial vertexColors roughness={.96} metalness={type === 'hot' ? .13 : .02} /></mesh>
    <mesh rotation={[0,0,0]} position={[0,0,0]}>
      {(type === 'lava' || type === 'hot') && <lineSegments geometry={cracks}><lineBasicMaterial color={type === 'lava' ? '#ff391e' : '#ff8d3b'} transparent opacity={type === 'lava' ? .94 : .48} /></lineSegments>}
    </mesh>
    <instancedMesh ref={rocks} args={[undefined, undefined, 184]}>
      <dodecahedronGeometry args={[1, 0]}/><meshStandardMaterial color={type==='cold'?'#a7b9bf':type==='lava'?'#351b1b':'#4d5553'} roughness={1} emissive={type==='lava'?'#4d160b':'#000000'} emissiveIntensity={.7}/>
    </instancedMesh>
  </group>;
}

function GiantClouds() {
  const material = useMemo(() => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: `varying vec2 vUv; varying vec3 vNormal; void main(){vUv=uv;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`, fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vNormal; void main(){float band=sin(vUv.y*82.0+sin(vUv.y*19.0+uTime*.08)*1.5);float swirl=sin(vUv.x*12.0+vUv.y*30.0+sin(vUv.y*9.0+uTime*.05)*2.0);float cloud=smoothstep(-.35,.45,band+swirl*.22);vec3 col=mix(vec3(.12,.14,.2),vec3(.72,.48,.36),cloud);float limb=pow(max(dot(normalize(vNormal),normalize(vec3(.4,.5,1.0))),0.0),.5);gl_FragColor=vec4(col*(.24+.8*limb),1.0);}` }), []);
  useFrame((_,dt)=>{material.uniforms.uTime.value+=dt;});
  return <mesh position={[0,1.3,-8]} scale={[5.5,5.5,5.5]} material={material}><sphereGeometry args={[1,48,36]}/></mesh>;
}

function Star({ planet, sim }) {
  const group = useRef(); const tidallyLocked = sim?.tidallyLocked;
  const k = Number(planet?.st_teff) || 5772; const color = starColor(k);
  const angle = Math.max(.05, sim?.starAngularDeg || .53); const visualFactor = clamp(5 / angle, 1, 30); const visualDistance = 31; const worldDistance = 8000; const scale = worldDistance / visualDistance;
  const apparent = clamp(Math.tan(THREE.MathUtils.degToRad(angle / 2)) * visualDistance * visualFactor, .65, 2.6) * scale;
  const baseY = 1.62 + (4.6 - 1.62) * scale;
  useFrame(({clock})=>{ if(group.current && !tidallyLocked) group.current.position.y=baseY+Math.sin(clock.elapsedTime*.025)*1.25*scale; });
  return <group ref={group} position={[0,baseY,-worldDistance]}>
    <mesh><sphereGeometry args={[apparent,32,24]}/><meshBasicMaterial color={color}/></mesh>
    <pointLight color={color} intensity={2.1} distance={90} decay={1.4}/>
  </group>;
}

function CameraRig({ type, phase, health, sim }) {
  const rig = useRef(); const { camera } = useThree();
  useLayoutEffect(() => {
    const previousParent = camera.parent;
    rig.current?.add(camera);
    return () => { rig.current?.remove(camera); previousParent?.add(camera); };
  }, [camera]);
  useFrame(({clock},dt)=>{
    const before=useGame.getState();
    if(before.phase==='descent'||before.phase==='alive') useGame.getState().tick(dt);
    const s=useGame.getState(); const descent=s.phase==='descent'?s.descentElapsed:0; const alive=s.phase==='alive';
    const t=clock.elapsedTime; const giant=type==='giant';
    const entryProgress=s.phase==='descent'?clamp(descent/3,0,1):0;
    const targetY=giant ? 1.6-descent*1.25-(alive?s.elapsed*1.1:0) : s.phase==='descent'?1.62-.3*entryProgress:1.62;
    const gravityStress=Math.min(.09,Math.abs((sim?.g??1)-1)*.025);
    const shake=(s.phase==='descent'?.075:0)+(health<35?(35-health)*.002:0)+gravityStress;
    const gravitySag=gravityStress*Math.sin(t*1.25)-Math.max(0,(sim?.g??1)-1.6)*.012;
    const offsetY=giant ? targetY - camera.position.y : (s.phase==='descent' ? targetY - 1.62 : gravitySag);
    if (rig.current) {
      rig.current.position.x=THREE.MathUtils.damp(rig.current.position.x,Math.sin(t*17)*shake,5,dt);
      rig.current.position.y=THREE.MathUtils.damp(rig.current.position.y,offsetY+Math.sin(t*2.1)*.012,4,dt);
    }
    const entryFov=s.phase==='descent'?50-16*entryProgress:alive&&s.elapsed<2?34+s.elapsed*8:50;
    if (s.phase !== 'alive' || giant) { camera.fov=THREE.MathUtils.damp(camera.fov,entryFov,3,dt); camera.updateProjectionMatrix(); }
  });
  return <group ref={rig}/>;
}

function Scene({ planet, sim, phase, health, lowQuality }) {
  const type=worldType(planet,sim); const tint=starColor(Number(planet?.st_teff)||5772);
  return <>
    <color attach="background" args={[type==='cold'?'#101b28':type==='lava'?'#160a0b':'#09111b']}/>
    <fog attach="fog" args={[type==='cold'?'#9caeb4':type==='lava'?'#2b100d':'#111d29',8,55]}/>
    <ambientLight intensity={type==='cold'?.62:.36} color={type==='cold'?'#a9c9ed':'#8ba8bd'}/>
    <directionalLight position={[-3,6,-8]} intensity={1.55} color={tint}/>
    {type==='giant' ? <GiantClouds/> : <Terrain type={type}/>}
    <Star planet={planet} sim={sim}/><CameraRig type={type} phase={phase} health={health} sim={sim}/>{type !== 'giant'&&<Player type={type} phase={phase} sim={sim}/>}
    {!lowQuality && <EffectComposer multisampling={0}>
      <Bloom intensity={.8} luminanceThreshold={.72} mipmapBlur/>
      <ChromaticAberration offset={new THREE.Vector2(.00012+(100-health)*.000007,.00012+(100-health)*.000007)} radialModulation={false} modulationOffset={0}/>
      <Vignette eskil={false} offset={.16} darkness={.42+(100-health)*.005}/>
    </EffectComposer>}
  </>;
}

export default function Surface({ lowQuality = false }) {
  const planet=useGame(s=>s.planet); const sim=useGame(s=>s.sim); const phase=useGame(s=>s.phase); const health=useGame(s=>s.health);
  return <div className="surface-root">
    <Canvas dpr={lowQuality?[.75,.9]:[1,1.35]} gl={{antialias:false,powerPreference:'high-performance',alpha:false}} camera={{position:[0,1.62,7.5],fov:50}}><Scene planet={planet} sim={sim} phase={phase} health={health} lowQuality={lowQuality}/></Canvas>
    <PlayerOverlay phase={phase} type={worldType(planet,sim)}/>
  </div>;
}
