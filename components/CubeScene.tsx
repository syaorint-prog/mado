'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { FaceTexture } from '@/types/article';

interface CubeSceneProps {
  faceTextures: FaceTexture[];
  isSplitting?: boolean;
  onSplitComplete?: () => void;
}

function MainCube({ faceTextures }: { faceTextures: FaceTexture[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureLoaderRef = useRef<THREE.TextureLoader | null>(null);

  // Initialize loader once
  if (!textureLoaderRef.current) {
    textureLoaderRef.current = new THREE.TextureLoader();
  }

  useEffect(() => {
    if (!meshRef.current) return;

    // Keep track of materials to be disposed later
    const materialsToDispose: THREE.Material[] = [];
    const texturesToDispose: THREE.Texture[] = [];

    // Create 6 materials for each face
    const materials: THREE.Material[] = [];

    for (let i = 0; i < 6; i++) {
      const faceTexture = faceTextures.find((ft) => ft.faceIndex === i);

      if (faceTexture && faceTexture.imageUrl) {
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(faceTexture.imageUrl)}`;

        // Temporary material while loading
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
                // We'll dispose the old one manually
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
            console.error(`Failed to load texture for face ${i}:`, error);
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

    // Cleanup function to dispose all resources
    return () => {
      materialsToDispose.forEach(m => m.dispose());
      texturesToDispose.forEach(t => t.dispose());
    };
  }, [faceTextures]);

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[3, 3, 3]} />
    </mesh>
  );
}

function SmallCube({ imageUrl, direction, index }: { imageUrl: string, direction: THREE.Vector3, index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  
  // Calculate a random target rotation for visual flair during explosion
  const targetRot = useRef(new THREE.Vector3(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  )).current;

  useEffect(() => {
    if (!meshRef.current) return;
    const loader = new THREE.TextureLoader();
    let mat: THREE.MeshStandardMaterial;
    let tex: THREE.Texture;

    if (imageUrl) {
      tex = loader.load(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
      mat = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.3, roughness: 0.5 });
    } else {
      mat = new THREE.MeshStandardMaterial({ color: '#009944', metalness: 0.3, roughness: 0.5 });
    }
    
    // Apply material to all 6 faces of the small cube
    meshRef.current.material = Array(6).fill(mat);

    return () => {
      mat.dispose();
      if (tex) tex.dispose();
    };
  }, [imageUrl]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    timeRef.current += delta;
    
    // Animation duration 1.5 seconds
    const progress = Math.min(timeRef.current / 1.5, 1);
    
    // easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3);
    
    // Fly outward distance = 4 units
    meshRef.current.position.copy(direction).multiplyScalar(ease * 4);
    
    // Rotate
    meshRef.current.rotation.x = ease * targetRot.x;
    meshRef.current.rotation.y = ease * targetRot.y;
    meshRef.current.rotation.z = ease * targetRot.z;
    
    // Optional: scale down slightly (from 1 to 0.8)
    const scale = 1 - (ease * 0.2);
    meshRef.current.scale.set(scale, scale, scale);
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
    </mesh>
  );
}

function SplittingCubes({ faceTextures, onSplitComplete }: { faceTextures: FaceTexture[], onSplitComplete: () => void }) {
  useEffect(() => {
    // Wait for the animation (1.5s) plus a small padding to feel right
    const timer = setTimeout(() => {
      onSplitComplete();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onSplitComplete]);

  // Standard BoxGeometry face directions
  // 0: right (+X), 1: left (-X), 2: top (+Y), 3: bottom (-Y), 4: front (+Z), 5: back (-Z)
  const directions = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  return (
    <group>
      {directions.map((dir, i) => {
        const faceTex = faceTextures.find(ft => ft.faceIndex === i);
        return (
          <SmallCube 
            key={i} 
            index={i} 
            imageUrl={faceTex?.imageUrl || ''} 
            direction={dir} 
          />
        );
      })}
    </group>
  );
}

export default function CubeScene({ faceTextures, isSplitting = false, onSplitComplete }: CubeSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -5]} intensity={0.5} />

      {isSplitting && onSplitComplete ? (
        <SplittingCubes faceTextures={faceTextures} onSplitComplete={onSplitComplete} />
      ) : (
        <MainCube faceTextures={faceTextures} />
      )}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      <gridHelper args={[20, 20, '#666666', '#333333']} />
    </>
  );
}

