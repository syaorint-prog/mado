'use client';

import { OrbitControls } from '@react-three/drei';
import { CompletedCube } from '@/types/article';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface BlockStackSceneProps {
  completedCubes: CompletedCube[];
}

function StackedCube({ cube, position }: { cube: CompletedCube; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  if (!textureLoaderRef.current) {
    textureLoaderRef.current = new THREE.TextureLoader();
  }

  useEffect(() => {
    if (!meshRef.current) return;

    const materialsToDispose: THREE.Material[] = [];
    const texturesToDispose: THREE.Texture[] = [];
    const materials: THREE.Material[] = [];

    for (let i = 0; i < 6; i++) {
      const faceTexture = cube.faceTextures.find((ft) => ft.faceIndex === i);

      if (faceTexture && faceTexture.imageUrl) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(faceTexture.imageUrl)}`;

        // Temporary
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
                : [meshRef.current.material];
              
              const oldMaterial = currentMaterials[i];
              if (oldMaterial) {
                if (oldMaterial instanceof THREE.Material) oldMaterial.dispose();
              }

              currentMaterials[i] = newMaterial;
              meshRef.current.material = currentMaterials;
              materialsToDispose.push(newMaterial);
              texturesToDispose.push(texture);
            }
          },
          undefined,
          (error) => {
            console.error(`Failed to load texture for cube ${cube.id} face ${i}:`, error);
          }
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

    return () => {
      materialsToDispose.forEach(m => m.dispose());
      texturesToDispose.forEach(t => t.dispose());
    };
  }, [cube]);

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[2, 2, 2]} />
    </mesh>
  );
}

export default function BlockStackScene({ completedCubes }: BlockStackSceneProps) {
  // 積み上げ位置を計算（縦に積む）
  const getStackPosition = (index: number): [number, number, number] => {
    const row = Math.floor(index / 5); // 5個ごとに新しい列
    const col = index % 5;
    return [col * 2.5 - 5, row * 2.5, 0];
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />

      {completedCubes.map((cube, index) => (
        <StackedCube
          key={cube.id}
          cube={cube}
          position={getStackPosition(index)}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
      />

      {/* 床のグリッド */}
      <gridHelper args={[30, 30, '#444444', '#222222']} position={[0, -1, 0]} />
    </>
  );
}

