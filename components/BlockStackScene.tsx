'use client';

import { OrbitControls } from '@react-three/drei';
import { CompletedCube } from '@/types/article';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Physics, RigidBody } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { ShapeType, getShapeCoords } from '@/lib/shapes';

interface BlockStackSceneProps {
  completedCubes: CompletedCube[];
  targetShape?: ShapeType | null;
}

function StorageContainer() {
  const wallThickness = 1;
  const boxSize = 24;
  const wallHeight = 20;
  
  // Custom transparent material for the glass container
  const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#00ffee',
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.98,
    ior: 1.5,
    thickness: 0.1,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  }), []);

  // Floor material
  const floorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a1a1a',
    metalness: 0.8,
    roughness: 0.2,
  }), []);

  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -wallThickness / 2, 0]} material={floorMaterial}>
          <boxGeometry args={[boxSize, wallThickness, boxSize]} />
        </mesh>
      </RigidBody>

      {/* Back Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, -boxSize / 2 - wallThickness / 2]} material={glassMaterial}>
          <boxGeometry args={[boxSize + wallThickness * 2, wallHeight, wallThickness]} />
        </mesh>
      </RigidBody>

      {/* Front Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, wallHeight / 2, boxSize / 2 + wallThickness / 2]} material={glassMaterial}>
          <boxGeometry args={[boxSize + wallThickness * 2, wallHeight, wallThickness]} />
        </mesh>
      </RigidBody>

      {/* Left Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-boxSize / 2 - wallThickness / 2, wallHeight / 2, 0]} material={glassMaterial}>
          <boxGeometry args={[wallThickness, wallHeight, boxSize]} />
        </mesh>
      </RigidBody>

      {/* Right Wall */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[boxSize / 2 + wallThickness / 2, wallHeight / 2, 0]} material={glassMaterial}>
          <boxGeometry args={[wallThickness, wallHeight, boxSize]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

const COLORS = [
  '#ff3b3b', // Bright Red
  '#ff9900', // Bright Orange
  '#ffcc00', // Bright Yellow
  '#00cc55', // Mado Green
  '#00ffee', // Cyan
  '#2266cc', // Royal Blue
  '#9933cc', // Purple
  '#ff66aa', // Pink
];

function DummyColorfulCube({ index, targetPosition }: { index: number; targetPosition: [number, number, number] | null }) {
  const rbRef = useRef<RapierRigidBody>(null);

  const initialPosition = useMemo(() => {
    return [
      (Math.random() - 0.5) * 20,              // X 
      8 + Math.random() * 20 + (index * 0.3),  // Y (drops sequentially from above)
      (Math.random() - 0.5) * 20               // Z 
    ] as [number, number, number];
  }, [index]);

  const initialRotation = useMemo(() => {
    return [
      Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI
    ] as [number, number, number];
  }, []);

  const color = useMemo(() => COLORS[index % COLORS.length], [index]);

  const prevTargetPosition = useRef(targetPosition);

  useEffect(() => {
    if (prevTargetPosition.current !== null && targetPosition === null) {
      // Disassemble explosion
      setTimeout(() => {
        if (!rbRef.current) return;
        rbRef.current.wakeUp();
        const curPos = rbRef.current.translation();
        const dx = curPos.x;
        const dz = curPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const mag = 10 + Math.random() * 20;

        const impulse = {
          x: (dx / dist) * mag + (Math.random() - 0.5) * 20,
          y: (Math.random() * mag) + 5,
          z: (dz / dist) * mag + (Math.random() - 0.5) * 20
        };
        const torque = {
          x: (Math.random() - 0.5) * 50,
          y: (Math.random() - 0.5) * 50,
          z: (Math.random() - 0.5) * 50
        };
        rbRef.current.applyImpulse(impulse, true);
        rbRef.current.applyTorqueImpulse(torque, true);
      }, 50); // wait briefly for Rapier physical mode to be definitively dynamic
    }
    prevTargetPosition.current = targetPosition;
  }, [targetPosition]);

  useFrame((_, delta) => {
    if (targetPosition && rbRef.current) {
      const curPos = rbRef.current.translation();
      const targetVec = new THREE.Vector3(...targetPosition);
      
      const newPos = new THREE.Vector3(curPos.x, curPos.y, curPos.z).lerp(targetVec, 4 * delta);
      rbRef.current.setNextKinematicTranslation(newPos);

      const curRot = rbRef.current.rotation();
      const targetQuat = new THREE.Quaternion().identity();
      const newRot = new THREE.Quaternion(curRot.x, curRot.y, curRot.z, curRot.w).slerp(targetQuat, 4 * delta);
      rbRef.current.setNextKinematicRotation(newRot);
    }
  });

  return (
    <RigidBody 
      ref={rbRef}
      type={targetPosition ? "kinematicPosition" : "dynamic"}
      colliders="cuboid" 
      position={initialPosition} 
      rotation={initialRotation}
      restitution={0.5} 
      friction={0.8}
    >
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.3} />
      </mesh>
    </RigidBody>
  );
}

function StackedCube({ cube, index, targetPosition }: { cube: CompletedCube; index: number; targetPosition: [number, number, number] | null }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rbRef = useRef<RapierRigidBody>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  if (!textureLoaderRef.current) {
    textureLoaderRef.current = new THREE.TextureLoader();
  }

  // Calculate a varied starting drop position
  // Uses index to stagger heights somewhat
  const initialPosition = useMemo(() => {
    return [
      (Math.random() - 0.5) * 16,     // X between -8 and 8
      15 + Math.random() * 5 + (index * 0.5), // Y stacked high depending on index
      (Math.random() - 0.5) * 16      // Z between -8 and 8
    ] as [number, number, number];
  }, [index, cube.id]);

  const initialRotation = useMemo(() => {
    return [
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    ] as [number, number, number];
  }, [cube.id]);

  useEffect(() => {
    if (!meshRef.current) return;

    const materialsToDispose: THREE.Material[] = [];
    const texturesToDispose: THREE.Texture[] = [];
    
    // 現在のキューブが持っている画像URLをユニーク（重複排除）にして取得します
    const uniqueUrls = [...new Set(cube.faceTextures.map(ft => ft.imageUrl).filter(Boolean))];

    // パターン1: 分裂後のブロックのように「全6面が同じ画像」の場合、1回の通信と1つのマテリアルで済ませます（激軽になります）
    if (uniqueUrls.length === 1) {
      const imageUrl = uniqueUrls[0] as string;
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

      const tempMaterial = new THREE.MeshStandardMaterial({
        color: '#006633',
        metalness: 0.5,
        roughness: 0.3,
      });
      materialsToDispose.push(tempMaterial);
      meshRef.current.material = Array(6).fill(tempMaterial);

      textureLoaderRef.current?.load(
        proxyUrl,
        (texture) => {
          const newMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.3,
            roughness: 0.5,
          });

          if (meshRef.current) {
            const currentMats = Array.isArray(meshRef.current.material) ? meshRef.current.material : [];
            const oldMat = currentMats[0];
            if (oldMat instanceof THREE.Material) oldMat.dispose();

            meshRef.current.material = Array(6).fill(newMaterial);
            materialsToDispose.push(newMaterial);
            texturesToDispose.push(texture);
          }
        },
        undefined,
        (error) => console.error(`Failed to load uniform texture for cube ${cube.id}:`, error)
      );
    } 
    // パターン2: キューブの面ごとに画像が違う場合（完成前のような挙動用）
    else {
      const materials: THREE.Material[] = [];
      for (let i = 0; i < 6; i++) {
        const faceTexture = cube.faceTextures.find((ft) => ft.faceIndex === i);

        if (faceTexture && faceTexture.imageUrl) {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(faceTexture.imageUrl)}`;
          const tempMaterial = new THREE.MeshStandardMaterial({
            color: '#006633',
            metalness: 0.5,
            roughness: 0.3,
          });
          materials[i] = tempMaterial;
          materialsToDispose.push(tempMaterial);

          textureLoaderRef.current?.load(
            proxyUrl,
            (texture) => {
              const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.3,
                roughness: 0.5,
              });

              if (meshRef.current) {
                const currentMaterials = Array.isArray(meshRef.current.material)
                  ? [...meshRef.current.material]
                  : [meshRef.current.material as THREE.Material];
                
                const oldMaterial = currentMaterials[i];
                if (oldMaterial instanceof THREE.Material) oldMaterial.dispose();

                currentMaterials[i] = newMaterial;
                meshRef.current.material = currentMaterials;
                materialsToDispose.push(newMaterial);
                texturesToDispose.push(texture);
              }
            },
            undefined,
            (error) => console.error(`Failed to load texture for cube ${cube.id} face ${i}:`, error)
          );
        } else {
          const defaultMaterial = new THREE.MeshStandardMaterial({
            color: '#009944',
            metalness: 0.5,
            roughness: 0.3,
          });
          materials[i] = defaultMaterial;
          materialsToDispose.push(defaultMaterial);
        }
      }
      meshRef.current.material = materials;
    }

    return () => {
      materialsToDispose.forEach(m => m.dispose());
      texturesToDispose.forEach(t => t.dispose());
    };
  }, [cube]);

  const prevTargetPosition = useRef(targetPosition);

  useEffect(() => {
    if (prevTargetPosition.current !== null && targetPosition === null) {
      // Disassemble explosion
      setTimeout(() => {
        if (!rbRef.current) return;
        rbRef.current.wakeUp();
        const curPos = rbRef.current.translation();
        const dx = curPos.x;
        const dz = curPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const mag = 10 + Math.random() * 20;

        const impulse = {
          x: (dx / dist) * mag + (Math.random() - 0.5) * 20,
          y: (Math.random() * mag) + 5,
          z: (dz / dist) * mag + (Math.random() - 0.5) * 20
        };
        const torque = {
          x: (Math.random() - 0.5) * 50,
          y: (Math.random() - 0.5) * 50,
          z: (Math.random() - 0.5) * 50
        };
        rbRef.current.applyImpulse(impulse, true);
        rbRef.current.applyTorqueImpulse(torque, true);
      }, 50); // wait briefly for Rapier physical mode to be definitively dynamic
    }
    prevTargetPosition.current = targetPosition;
  }, [targetPosition]);

  useFrame((_, delta) => {
    if (targetPosition && rbRef.current) {
      const curPos = rbRef.current.translation();
      const targetVec = new THREE.Vector3(...targetPosition);
      
      const newPos = new THREE.Vector3(curPos.x, curPos.y, curPos.z).lerp(targetVec, 4 * delta);
      rbRef.current.setNextKinematicTranslation(newPos);

      const curRot = rbRef.current.rotation();
      const targetQuat = new THREE.Quaternion().identity();
      const newRot = new THREE.Quaternion(curRot.x, curRot.y, curRot.z, curRot.w).slerp(targetQuat, 4 * delta);
      rbRef.current.setNextKinematicRotation(newRot);
    }
  });

  return (
    <RigidBody 
      ref={rbRef}
      type={targetPosition ? "kinematicPosition" : "dynamic"}
      colliders="cuboid" 
      position={initialPosition} 
      rotation={initialRotation}
      restitution={0.5} // slightly bouncy
      friction={0.8}
    >
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2, 2]} />
      </mesh>
    </RigidBody>
  );
}
function CameraFocus({ targetShape }: { targetShape: ShapeType | null }) {
  const { controls } = useThree();

  useFrame((_, delta) => {
    if (controls) {
      // 形状形成時は高めにフォーカス（Y=30）、普段は箱へフォーカス（Y=8）
      const targetY = targetShape ? 30 : 8;
      const targetVec = new THREE.Vector3(0, targetY, 0);
      
      // OrbitControls の target を毎フレーム滑らかに変更する
      (controls as any).target.lerp(targetVec, 2 * delta);
    }
  });

  return null;
}

export default function BlockStackScene({ completedCubes, targetShape }: BlockStackSceneProps) {
  // ハッカソン用：デフォルトで落ちてくる500個のカラフルなブロック
  const dummyCubes = useMemo(() => Array.from({ length: 500 }).map((_, i) => i), []);

  const shapeCoords = useMemo(() => getShapeCoords(targetShape ?? null), [targetShape]);
  const requiredCount = shapeCoords.length;

  const getTargetPos = useCallback((cubeType: 'completed' | 'dummy', index: number): [number, number, number] | null => {
    if (!targetShape) return null;
    
    // We prioritize completedCubes first
    // If completed is 5, and we need 40 blocks, they take indices 0-4.
    // Dummies take indices 5-39.
    const completedLength = completedCubes.length;
    let globalIndex = -1;

    if (cubeType === 'completed') {
      globalIndex = index;
    } else {
      globalIndex = completedLength + index;
    }

    if (globalIndex >= 0 && globalIndex < requiredCount) {
      return shapeCoords[globalIndex];
    }
    return null;
  }, [targetShape, shapeCoords, completedCubes.length]);

  return (
    <>
      <color attach="background" args={['#eef6f0']} />
      
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      {/* カメラフォーカスの自動調整 */}
      <CameraFocus targetShape={targetShape ?? null} />

      {/* 
        Wrap everything physical in Physics context.
        Provide a slightly more bouncy and robust physical world.
      */}
      <Physics gravity={[0, -9.81, 0]}>
        <StorageContainer />

        {/* 500 default attractive dummy cubes */}
        {dummyCubes.map(i => (
          <DummyColorfulCube 
            key={`dummy-${i}`} 
            index={i} 
            targetPosition={getTargetPos('dummy', i)}
          />
        ))}

        {completedCubes.map((cube, index) => (
          <StackedCube
            key={cube.id}
            cube={cube}
            index={index + 500} // start height slightly above dummy cubes
            targetPosition={getTargetPos('completed', index)}
          />
        ))}
      </Physics>


      <OrbitControls
        makeDefault
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={70} // ズームアウト制限を緩和して形全体を見やすくする
        maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going strictly below the ground
      />
    </>
  );
}
