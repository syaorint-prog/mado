'use client';

import { OrbitControls } from '@react-three/drei';
import { CompletedCube } from '@/types/article';
import { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Physics, RigidBody } from '@react-three/rapier';

interface BlockStackSceneProps {
  completedCubes: CompletedCube[];
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

function StackedCube({ cube, index }: { cube: CompletedCube; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
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

  return (
    <RigidBody 
      type="dynamic" 
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

export default function BlockStackScene({ completedCubes }: BlockStackSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[15, 20, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.5} />

      {/* 
        Wrap everything physical in Physics context.
        Provide a slightly more bouncy and robust physical world.
      */}
      <Physics gravity={[0, -9.81, 0]}>
        <StorageContainer />

        {completedCubes.map((cube, index) => (
          <StackedCube
            key={cube.id}
            cube={cube}
            index={index}
          />
        ))}
      </Physics>

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={10}
        maxDistance={50}
        target={[0, 8, 0]} // Center camera focus higher to view the box
        maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going strictly below the ground
      />
    </>
  );
}

