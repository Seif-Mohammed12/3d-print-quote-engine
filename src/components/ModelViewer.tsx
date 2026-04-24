import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface Props {
  fileBuffer: ArrayBuffer;
}

function STLModel({ buffer }: { buffer: ArrayBuffer }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const view = new DataView(buffer);

    // Try binary STL
    if (buffer.byteLength > 84) {
      const triangleCount = view.getUint32(80, true);
      const positions = new Float32Array(triangleCount * 9);
      const normals = new Float32Array(triangleCount * 9);

      for (let i = 0; i < triangleCount; i++) {
        const offset = 84 + i * 50;
        const nx = view.getFloat32(offset, true);
        const ny = view.getFloat32(offset + 4, true);
        const nz = view.getFloat32(offset + 8, true);

        for (let v = 0; v < 3; v++) {
          const vOffset = offset + 12 + v * 12;
          const idx = i * 9 + v * 3;
          positions[idx] = view.getFloat32(vOffset, true);
          positions[idx + 1] = view.getFloat32(vOffset + 4, true);
          positions[idx + 2] = view.getFloat32(vOffset + 8, true);
          normals[idx] = nx;
          normals[idx + 1] = ny;
          normals[idx + 2] = nz;
        }
      }

      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    }

    geo.computeBoundingSphere();
    geo.center();
    return geo;
  }, [buffer]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="hsl(190, 100%, 50%)"
        metalness={0.3}
        roughness={0.4}
        emissive="hsl(190, 100%, 20%)"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

function AutoRotate({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group | null>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.35;
  });

  return <group ref={groupRef}>{children}</group>;
}

const ModelViewer = ({ fileBuffer }: Props) => (
  <div className="w-full aspect-square rounded-xl overflow-hidden glass-card">
    <Canvas camera={{ fov: 45, position: [0, 0, 140] }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[40, 40, 30]} intensity={0.9} />
        <directionalLight position={[-30, -15, -20]} intensity={0.35} />
        <AutoRotate>
          <STLModel buffer={fileBuffer} />
        </AutoRotate>
      </Suspense>
    </Canvas>
  </div>
);

export default ModelViewer;
