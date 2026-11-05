'use client';

import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import {
  CanvasTexture,
  QuadraticBezierCurve3,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';

import type { TwinLayout, TwinRack } from '@bjk/api/types/twin';

import type { BinLook } from '@/utils/twin';

// three.js 재질은 CSS 클래스를 못 쓰니 토큰(CSS 변수)을 실행 시점에 읽는다. 데이터·장식 색이라
// 차트처럼 프리미티브를 쓴다(design-system "차트"). 의미는 색 + 라벨 + 범례 + 표로 함께 전한다.
const PALETTE_VARS = {
  background: '--color-gray-100',
  floor: '--color-gray-200',
  tape: '--color-sub-500',
  tapeDark: '--color-gray-700',
  rack: '--color-gray-500',
  shelf: '--color-gray-400',
  normal: '--color-gray-0',
  low: '--color-orange-500',
  risk: '--color-red-500',
  out: '--color-red-500',
  suspect: '--color-gray-900',
  hidden: '--color-brand-500',
  machine: '--color-gray-500',
  crate: '--color-sub-300',
  selected: '--color-brand-600',
} as const;
type Palette = Record<keyof typeof PALETTE_VARS, string>;

const readPalette = (): Palette => {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    Object.entries(PALETTE_VARS).map(([key, name]) => [key, style.getPropertyValue(name).trim()]),
  ) as Palette;
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 선반 한 칸 (m)
const CELL = { w: 0.9, d: 0.6, h: 0.5 } as const;
const BLOCK = { w: 0.68, d: 0.44 } as const;
const MAX_H = 0.4;

export const binPosition = (rack: TwinRack, level: number, slot: number) =>
  [rack.x + (slot - (rack.slots + 1) / 2) * CELL.w, (level - 1) * CELL.h + 0.04, rack.z] as const;

// ---- 바닥: 안전선(노란 테이프), 통로 점선, 입고 도크 빗금 ----
const floorTexture = (layout: TwinLayout, p: Palette) => {
  const scale = 40; // 1m = 40px
  const { width, depth } = layout.size;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = depth * scale;
  const g = canvas.getContext('2d')!;
  const X = (x: number) => (x + width / 2) * scale;
  const Z = (z: number) => (z + depth / 2) * scale;
  g.fillStyle = p.floor;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (const zone of layout.zones) {
    const x = X(zone.x - zone.width / 2);
    const z = Z(zone.z - zone.depth / 2);
    const w = zone.width * scale;
    const h = zone.depth * scale;
    if (zone.kind === 'dock') {
      g.save();
      g.beginPath();
      g.rect(x, z, w, h);
      g.clip();
      g.fillStyle = p.tape;
      for (let i = -h; i < w + h; i += 34) {
        g.beginPath();
        g.moveTo(x + i, z);
        g.lineTo(x + i + 17, z);
        g.lineTo(x + i + 17 - h, z + h);
        g.lineTo(x + i - h, z + h);
        g.closePath();
        g.fill();
      }
      g.restore();
      g.strokeStyle = p.tapeDark;
      g.lineWidth = 3;
      g.strokeRect(x, z, w, h);
    } else {
      g.strokeStyle = p.tape;
      g.lineWidth = 7;
      g.strokeRect(x, z, w, h);
    }
  }
  // 보관 구역과 가공 라인 사이 통로
  g.setLineDash([22, 16]);
  g.strokeStyle = p.tape;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(X(0.4), 0);
  g.lineTo(X(0.4), canvas.height);
  g.stroke();
  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
};

const Floor = ({ layout, palette }: { layout: TwinLayout; palette: Palette }) => {
  const [texture] = useState(() => floorTexture(layout, palette));
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[layout.size.width, layout.size.depth]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
};

const RackFrame = ({ rack, palette }: { rack: TwinRack; palette: Palette }) => {
  const width = rack.slots * CELL.w;
  const height = rack.levels * CELL.h;
  return (
    <group position={[rack.x, 0, rack.z]}>
      {rack.levels > 1
        ? [-width / 2, width / 2].flatMap((x) =>
            [-CELL.d / 2, CELL.d / 2].map((z) => (
              <mesh key={`${x}-${z}`} position={[x, height / 2, z]} castShadow>
                <boxGeometry args={[0.06, height, 0.06]} />
                <meshStandardMaterial color={palette.rack} roughness={0.85} />
              </mesh>
            )),
          )
        : null}
      {Array.from({ length: rack.levels }, (_, i) => (
        <mesh key={i} position={[0, i * CELL.h + 0.02, 0]} receiveShadow>
          <boxGeometry args={[width, 0.04, CELL.d]} />
          <meshStandardMaterial color={palette.shelf} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
};

// ---- 칸(부품) ----
export type SceneBin = {
  id: string;
  position: readonly [number, number, number];
  height: number; // 0~1 (재주문점 대비)
  look: BinLook;
  hidden: boolean; // 숨은 재고 테두리
  dimmed: boolean; // 검색 강조 중인 다른 칸
  selected: boolean;
};

const Bin = ({
  bin,
  palette,
  onSelect,
}: {
  bin: SceneBin;
  palette: Palette;
  onSelect: (id: string) => void;
}) => {
  const block = useRef<Mesh>(null);
  const target = bin.look === 'out' ? 0.03 : Math.max(0.05, bin.height * MAX_H);
  const color = palette[bin.look];

  useFrame(({ clock }, delta) => {
    const mesh = block.current;
    if (!mesh) return;
    // 날짜를 넘길 때 상자가 줄고 느는 모습이 보이게 높이를 따라간다
    mesh.scale.y += (target - mesh.scale.y) * Math.min(1, delta * 8);
    mesh.position.y = mesh.scale.y / 2;
    // 장부 의심 칸은 파랗게 깜빡인다 (움직임 줄이기 설정이면 멈춘다)
    const material = mesh.material as MeshStandardMaterial;
    material.emissiveIntensity = bin.selected
      ? 0.55
      : bin.look === 'suspect' && !reducedMotion()
        ? 0.35 + 0.35 * Math.sin(clock.elapsedTime * 4)
        : 0;
  });

  return (
    <group position={[bin.position[0], bin.position[1], bin.position[2]]}>
      <mesh
        ref={block}
        scale={[1, target, 1]}
        position={[0, target / 2, 0]}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect(bin.id);
        }}
        onPointerOver={() => void (document.body.style.cursor = 'pointer')}
        onPointerOut={() => void (document.body.style.cursor = '')}
      >
        <boxGeometry args={[BLOCK.w, 1, BLOCK.d]} />
        <meshStandardMaterial
          color={color}
          emissive={bin.selected ? palette.selected : palette.hidden}
          emissiveIntensity={0}
          roughness={0.7}
          // transparent 를 바꾸면 재질을 다시 컴파일해야 해서 늘 켜 두고 opacity 만 바꾼다
          transparent
          opacity={bin.dimmed ? 0.15 : 1}
        />
      </mesh>
      {bin.look === 'out' ? (
        // 비어 있는 칸 — 있어야 할 상자의 빨간 윤곽
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[BLOCK.w, 0.4, BLOCK.d]} />
          <meshBasicMaterial visible={false} />
          <Edges color={palette.risk} />
        </mesh>
      ) : null}
      {bin.hidden ? (
        <mesh position={[0, (target + 0.1) / 2, 0]}>
          <boxGeometry args={[BLOCK.w + 0.12, target + 0.1, BLOCK.d + 0.1]} />
          <meshBasicMaterial visible={false} />
          <Edges color={palette.hidden} />
        </mesh>
      ) : null}
    </group>
  );
};

// ---- 설비 ----
export type SceneEquipment = {
  id: string;
  x: number;
  z: number;
  kind: TwinLayout['equipment'][number]['kind'];
  down: boolean;
  selected: boolean;
};

// [너비, 높이, 깊이, x, y, z] — 단순한 상자 조합. 모양보다 "어디에 무엇이 있나"가 보이면 된다.
const SHAPES: Record<SceneEquipment['kind'], [number, number, number, number, number, number][]> = {
  lathe: [
    [2.6, 0.9, 1.1, 0, 0.45, 0],
    [0.8, 0.5, 0.9, -0.8, 1.15, 0],
  ],
  mill: [
    [1.8, 1.6, 1.6, 0, 0.8, 0],
    [0.8, 0.8, 0.8, -0.3, 2, 0],
  ],
  press: [
    [1.4, 0.7, 0.9, 0, 0.35, 0],
    [0.3, 1.6, 0.8, -0.55, 1.5, 0],
    [0.3, 1.6, 0.8, 0.55, 1.5, 0],
    [1.4, 0.35, 0.9, 0, 2.45, 0],
  ],
  compressor: [
    [1.9, 0.9, 0.9, 0, 0.45, 0],
    [0.7, 0.5, 0.6, 0.3, 1.15, 0],
  ],
  conveyor: [
    [4, 0.15, 0.8, 0, 0.75, 0],
    [0.2, 0.7, 0.7, -1.7, 0.35, 0],
    [0.2, 0.7, 0.7, 1.7, 0.35, 0],
  ],
};

const EquipmentBody = ({
  equipment,
  palette,
  onSelect,
}: {
  equipment: SceneEquipment;
  palette: Palette;
  onSelect: (id: string) => void;
}) => {
  const color = equipment.down ? palette.risk : palette.machine;
  return (
    <group
      position={[equipment.x, 0, equipment.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(equipment.id);
      }}
      onPointerOver={() => void (document.body.style.cursor = 'pointer')}
      onPointerOut={() => void (document.body.style.cursor = '')}
    >
      {SHAPES[equipment.kind].map(([w, h, d, x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={color}
            roughness={0.75}
            emissive={palette.selected}
            emissiveIntensity={equipment.selected ? 0.4 : 0}
          />
        </mesh>
      ))}
    </group>
  );
};

// ---- 설비 영향선 ----
export type SceneLink = {
  id: string;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  severe: boolean; // 비어 있음이면 굵게 (결품 위험도 같은 빨강 — 칸 색과 맞춘다)
};

const ImpactLink = ({ link, palette }: { link: SceneLink; palette: Palette }) => {
  const a = new Vector3(link.from[0], link.from[1] + 0.5, link.from[2]);
  const b = new Vector3(link.to[0], 1.4, link.to[2]);
  const mid = a.clone().lerp(b, 0.5);
  mid.y = 3.4;
  return (
    <mesh>
      <tubeGeometry
        args={[new QuadraticBezierCurve3(a, mid, b), 40, link.severe ? 0.06 : 0.035, 6, false]}
      />
      <meshBasicMaterial color={palette.risk} />
    </mesh>
  );
};

// ---- 입고 도크의 상자 ----
export type SceneCrate = {
  id: string;
  position: readonly [number, number, number];
  // 입고 장면: 선반 칸으로 날아간다
  flyTo: readonly [number, number, number] | null;
  onLanded?: () => void;
};

const Crate = ({ crate, palette }: { crate: SceneCrate; palette: Palette }) => {
  const ref = useRef<Mesh>(null);
  const progress = useRef(0);
  const landed = useRef(false);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh || !crate.flyTo) return;
    progress.current = reducedMotion() ? 1 : Math.min(1, progress.current + delta / 1.6);
    const t = progress.current;
    const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const [fx, fy, fz] = crate.position;
    const [tx, ty, tz] = crate.flyTo;
    mesh.position.set(
      fx + (tx - fx) * k,
      fy + (ty - fy) * k + Math.sin(Math.PI * k) * 2.2,
      fz + (tz - fz) * k,
    );
    if (t >= 1 && !landed.current) {
      landed.current = true;
      crate.onLanded?.();
    }
  });
  return (
    <mesh ref={ref} position={[crate.position[0], crate.position[1], crate.position[2]]} castShadow>
      <boxGeometry args={[0.9, 0.6, 0.8]} />
      <meshStandardMaterial color={palette.crate} roughness={0.9} />
    </mesh>
  );
};

// ---- 카메라: 장면 전환·목록 클릭 시 부드럽게 옮긴다 ----
export type CameraFocus = { x: number; z: number; distance: number };

type OrbitLike = { target: Vector3; update: () => void };

const CameraRig = ({ focus }: { focus: CameraFocus }) => {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const camera = useThree((s) => s.camera);
  const anim = useRef<{
    t: number;
    fromP: Vector3;
    fromT: Vector3;
    toP: Vector3;
    toT: Vector3;
  } | null>(null);
  useEffect(() => {
    if (!controls) return;
    const toT = new Vector3(focus.x, 0.6, focus.z);
    const toP = new Vector3(
      focus.x + focus.distance * 0.35,
      focus.distance * 0.85,
      focus.z + focus.distance * 0.8,
    );
    if (reducedMotion()) {
      controls.target.copy(toT);
      camera.position.copy(toP);
      return;
    }
    anim.current = {
      t: 0,
      fromP: camera.position.clone(),
      fromT: controls.target.clone(),
      toP,
      toT,
    };
  }, [focus, controls, camera]);
  useFrame((_, delta) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + delta / 0.9);
    const k = 1 - (1 - a.t) ** 3;
    camera.position.lerpVectors(a.fromP, a.toP, k);
    controls.target.lerpVectors(a.fromT, a.toT, k);
    if (a.t >= 1) anim.current = null;
  });
  return null;
};

// ---- 라벨: 바깥 DOM 요소를 3D 좌표에 맞춰 옮긴다 ----
// drei Html 은 라벨마다 React 루트를 새로 만들어 개발 모드에서 경고가 나서, 라벨은 바깥 트리에 두고 위치만 여기서 정한다.
export type LabelAnchors = {
  current: Map<string, { el: HTMLElement; pos: readonly [number, number, number] }>;
};

const LabelProjector = ({ anchors }: { anchors: LabelAnchors }) => {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const v = useRef(new Vector3());
  useFrame(() => {
    for (const { el, pos } of anchors.current.values()) {
      v.current.set(pos[0], pos[1], pos[2]).project(camera);
      const visible =
        v.current.z < 1 && Math.abs(v.current.x) < 1.05 && Math.abs(v.current.y) < 1.05;
      el.style.display = visible ? '' : 'none';
      el.style.transform = `translate(${((v.current.x + 1) / 2) * size.width}px, ${((1 - v.current.y) / 2) * size.height}px) translate(-50%, -100%)`;
    }
  });
  return null;
};

type WarehouseSceneProps = {
  layout: TwinLayout;
  bins: SceneBin[];
  equipment: SceneEquipment[];
  links: SceneLink[];
  crates: SceneCrate[];
  focus: CameraFocus;
  anchors: LabelAnchors;
  onSelectBin: (id: string) => void;
  onSelectEquipment: (id: string) => void;
  onClear: () => void;
};

// 디지털 트윈 3D 창고 (W-11). 계산하지 않고 받은 상태를 그리기만 한다.
const WarehouseScene = ({
  layout,
  bins,
  equipment,
  links,
  crates,
  focus,
  anchors,
  onSelectBin,
  onSelectEquipment,
  onClear,
}: WarehouseSceneProps) => {
  // ssr:false 로만 불러오는 컴포넌트라 첫 렌더에서 바로 document 를 읽어도 된다
  const [palette] = useState(readPalette);
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  return (
    <Canvas
      shadows="percentage"
      camera={{ position: [5, 17, 16], fov: 38 }}
      onPointerMissed={onClear}
      aria-label="공장 창고 3D 화면. 칸이나 설비를 누르면 오른쪽에 자세한 내용이 나와요."
    >
      <color attach="background" args={[palette.background]} />
      <hemisphereLight args={[palette.normal, palette.shelf, 1.1]} />
      <directionalLight
        position={[8, 18, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />

      <Floor layout={layout} palette={palette} />
      {layout.racks.map((rack) => (
        <RackFrame key={rack.id} rack={rack} palette={palette} />
      ))}
      {bins.map((bin) => (
        <Bin key={bin.id} bin={bin} palette={palette} onSelect={onSelectBin} />
      ))}
      {equipment.map((e) => (
        <EquipmentBody key={e.id} equipment={e} palette={palette} onSelect={onSelectEquipment} />
      ))}
      {links.map((link) => (
        <ImpactLink key={link.id} link={link} palette={palette} />
      ))}
      {crates.map((crate) => (
        <Crate key={crate.id} crate={crate} palette={palette} />
      ))}

      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        minDistance={8}
        maxDistance={40}
        maxPolarAngle={Math.PI * 0.46}
      />
      <CameraRig focus={focus} />
      <LabelProjector anchors={anchors} />
    </Canvas>
  );
};

export default WarehouseScene;
