export function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[12, 12]} />
      <meshStandardMaterial color="#f6f8fa" />
    </mesh>
  );
}
