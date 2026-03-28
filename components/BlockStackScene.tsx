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

