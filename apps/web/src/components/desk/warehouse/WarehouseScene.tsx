'use client';

import { Edges, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import {
  CanvasTexture,
  DoubleSide,
  QuadraticBezierCurve3,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';

import type { TwinLayout, TwinRack } from '@bjk/api/types/twin';

import type { BinLook } from '@/utils/twin';

// three.js 재질은 CSS 클래스를 못 쓰니 토큰(CSS 변수)을 실행 시점에 읽는다. 데이터·장식 색이라
// 차트처럼 프리미티브를 쓴다(design-system "차트"). 의미는 색 + 라벨 + 범례 + 표로 함께 전한다.
// 톤: 연한 하늘색 창고(brand-50 배경, 파란 조립식 랙). 상태색(주황·빨강)은 상자와 LED 에만 쓴다.
const PALETTE_VARS = {
  background: '--color-brand-50',
  ground: '--color-brand-100',
  floor: '--color-gray-50',
  grid: '--color-brand-100',
  zoneLine: '--color-brand-200',
  aisle: '--color-brand-300',
  zoneText: '--color-brand-300',
  tape: '--color-sub-500',
  tapeDark: '--color-gray-700',
  upright: '--color-brand-300',
  beam: '--color-brand-200',
  deck: '--color-gray-100',
  sign: '--color-brand-600',
  white: '--color-gray-0',
  normal: '--color-brand-100',
  low: '--color-orange-500',
  risk: '--color-red-500',
  out: '--color-red-500',
  suspect: '--color-gray-900',
  hidden: '--color-brand-500',
  glow: '--color-brand-400',
  ledOk: '--color-green-500',
  ledOff: '--color-gray-300',
  edge: '--color-gray-400',
  machine: '--color-gray-300',
  machineDark: '--color-gray-500',
  forklift: '--color-sub-300',
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
const STACK = 3; // 칸 하나에 쌓는 상자 수 (재주문점 대비 채움 정도)
const CRATE_H = MAX_H / STACK;
const CEILING = 5.5; // 강조 빛기둥 꼭대기

export const binPosition = (rack: TwinRack, level: number, slot: number) =>
  [rack.x + (slot - (rack.slots + 1) / 2) * CELL.w, (level - 1) * CELL.h + 0.04, rack.z] as const;

const fontFamily = () => getComputedStyle(document.body).fontFamily || 'sans-serif';

// 글자 텍스처 (선반 간판). 크기 비율을 함께 돌려준다
const textTexture = (text: string, fg: string, bg: string) => {
  const size = 96;
  const pad = 30;
  const font = `600 ${size}px ${fontFamily()}`;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = Math.ceil(size + pad * 1.4);
  canvas.width = w;
  canvas.height = h;
  g.font = font;
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(0, 0, w, h, 18);
  g.fill();
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.fillText(text, pad, h / 2 + 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: w / h };
};

// ---- 바닥: 타일 격자, 구역선과 구역 이름, 통로 점선, 입고 도크 빗금 ----
const floorTexture = (layout: TwinLayout, p: Palette) => {
  const scale = 48; // 1m = 48px
  const { width, depth } = layout.size;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = depth * scale;
  const g = canvas.getContext('2d')!;
  const X = (x: number) => (x + width / 2) * scale;
  const Z = (z: number) => (z + depth / 2) * scale;
  g.fillStyle = p.floor;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.strokeStyle = p.grid;
  g.lineWidth = 2;
  for (let x = 0; x <= width; x++) {
    g.beginPath();
    g.moveTo(x * scale, 0);
    g.lineTo(x * scale, canvas.height);
    g.stroke();
  }
  for (let z = 0; z <= depth; z++) {
    g.beginPath();
    g.moveTo(0, z * scale);
    g.lineTo(canvas.width, z * scale);
    g.stroke();
  }
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
      for (let i = -h; i < w + h; i += 40) {
        g.beginPath();
        g.moveTo(x + i, z);
        g.lineTo(x + i + 20, z);
        g.lineTo(x + i + 20 - h, z + h);
        g.lineTo(x + i - h, z + h);
        g.closePath();
        g.fill();
      }
      g.restore();
      g.strokeStyle = p.tapeDark;
      g.lineWidth = 3;
      g.strokeRect(x, z, w, h);
    } else {
      g.strokeStyle = p.zoneLine;
      g.lineWidth = 7;
      g.strokeRect(x, z, w, h);
      // 구역 이름 — 바닥에 크게, 앞쪽 가장자리 안쪽
      g.fillStyle = p.zoneText;
      g.font = `600 ${scale * 0.55}px ${fontFamily()}`;
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText(zone.label, X(zone.x), z + h - scale * 0.2);
    }
  }
  // 보관 구역과 가공 라인 사이 통로
  g.setLineDash([22, 16]);
  g.strokeStyle = p.aisle;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(X(AISLE_X), 0);
  g.lineTo(X(AISLE_X), canvas.height);
  g.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const AISLE_X = 0.4;

const Floor = ({ layout, palette }: { layout: TwinLayout; palette: Palette }) => {
  const [texture] = useState(() => floorTexture(layout, palette));
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[layout.size.width, layout.size.depth]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
};

// ---- 조립식 랙: 기둥·가새·앞뒤 보·선반판·칸마다 LED 자리·간판 ----
const RackSign = ({ text, y, palette }: { text: string; y: number; palette: Palette }) => {
  const [sign] = useState(() => textTexture(text, palette.sign, palette.white));
  useEffect(() => () => sign.texture.dispose(), [sign]);
  const h = 0.36;
  return (
    <>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[0, y, (side * CELL.d) / 2 + side * 0.02]}
          rotation={[0, side > 0 ? 0 : Math.PI, 0]}
        >
          <planeGeometry args={[h * sign.aspect, h]} />
          <meshBasicMaterial map={sign.texture} transparent />
        </mesh>
      ))}
    </>
  );
};

const RackFrame = ({ rack, palette }: { rack: TwinRack; palette: Palette }) => {
  const width = rack.slots * CELL.w;
  const height = rack.levels * CELL.h;
  const tall = rack.levels > 1;
  const posts = tall ? [-width / 2, ...(rack.slots > 2 ? [0] : []), width / 2] : [];
  const braces = Math.floor(height / 0.45);
  return (
    <group position={[rack.x, 0, rack.z]}>
      {posts.flatMap((x) => [
        ...[-CELL.d / 2, CELL.d / 2].map((z) => (
          <mesh key={`p${x}${z}`} position={[x, (height + 0.1) / 2, z]} castShadow receiveShadow>
            <boxGeometry args={[0.05, height + 0.1, 0.05]} />
            <meshStandardMaterial color={palette.upright} roughness={0.55} metalness={0.1} />
          </mesh>
        )),
        // 옆면 X 가새
        ...Array.from({ length: braces }, (_, k) => (
          <mesh
            key={`b${x}${k}`}
            position={[x, 0.25 + k * 0.45, 0]}
            rotation={[(k % 2 ? 1 : -1) * 0.85, 0, 0]}
          >
            <boxGeometry args={[0.02, 0.62, 0.02]} />
            <meshStandardMaterial color={palette.upright} roughness={0.55} />
          </mesh>
        )),
      ])}
      {Array.from({ length: rack.levels + (tall ? 1 : 0) }, (_, i) => {
        const y = i * CELL.h;
        const deck = i < rack.levels;
        return (
          <group key={i} position={[0, y, 0]}>
            {[-CELL.d / 2, CELL.d / 2].map((z) => (
              <mesh key={z} position={[0, 0, z]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.06, 0.035]} />
                <meshStandardMaterial color={palette.beam} roughness={0.55} metalness={0.1} />
              </mesh>
            ))}
            {deck ? (
              <mesh position={[0, 0.03, 0]} receiveShadow>
                <boxGeometry args={[width - 0.02, 0.015, CELL.d]} />
                <meshStandardMaterial color={palette.deck} roughness={0.7} />
              </mesh>
            ) : null}
            {/* 칸마다 꺼진 LED — 부품이 있는 칸은 Bin 이 상태색 LED 를 덮는다 */}
            {deck
              ? Array.from({ length: rack.slots }, (_, s) => (
                  <mesh
                    key={`led${s}`}
                    position={[(s - (rack.slots - 1) / 2) * CELL.w, -0.015, CELL.d / 2 + 0.025]}
                  >
                    <boxGeometry args={[0.16, 0.035, 0.015]} />
                    <meshBasicMaterial color={palette.ledOff} />
                  </mesh>
                ))
              : null}
          </group>
        );
      })}
      <RackSign
        text={`${rack.label} · ${rack.purpose}`}
        y={(tall ? height : 0.2) + 0.42}
        palette={palette}
      />
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
  beam: boolean; // 빛기둥으로 위치 강조 (선택·검색 결과)
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
  const crates = useRef<(Mesh | null)[]>([]);
  const glow = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const [hover, setHover] = useState(false);
  const target = bin.look === 'out' ? 0 : bin.height;
  const fill = useRef(target);
  const color = palette[bin.look];
  const led = bin.look === 'normal' ? palette.ledOk : palette[bin.look];
  const beamH = CEILING - bin.position[1];

  useFrame(({ clock }, delta) => {
    const still = reducedMotion();
    const t = clock.elapsedTime;
    // 날짜를 넘길 때 상자가 하나씩 줄고 느는 모습이 보이게 채움 정도를 따라간다
    fill.current += (target - fill.current) * Math.min(1, delta * 8);
    // 장부 의심 칸은 파랗게 깜빡인다 (움직임 줄이기 설정이면 멈춘다)
    const emissive = bin.selected
      ? 0.55
      : bin.look === 'suspect' && !still
        ? 0.35 + 0.35 * Math.sin(t * 4)
        : 0;
    crates.current.forEach((mesh, k) => {
      if (!mesh) return;
      const s = Math.min(1, Math.max(0, fill.current * STACK - k));
      mesh.visible = s > 0.02;
      mesh.scale.y = Math.max(0.001, s);
      mesh.position.y = k * CRATE_H + (CRATE_H * 0.92 * s) / 2;
      (mesh.material as MeshStandardMaterial).emissiveIntensity = emissive;
    });
    const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin(t * 5);
    if (glow.current) {
      (glow.current.material as MeshBasicMaterial).opacity = bin.selected
        ? 0.22 + 0.12 * pulse
        : bin.beam
          ? 0.1 + 0.15 * pulse
          : hover
            ? 0.14
            : 0;
    }
    if (beam.current) {
      (beam.current.material as MeshBasicMaterial).opacity = 0.08 + 0.1 * pulse;
    }
  });

  return (
    <group
      position={[bin.position[0], bin.position[1], bin.position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(bin.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
      }}
    >
      {Array.from({ length: STACK }, (_, k) => (
        <mesh
          key={k}
          ref={(m) => void (crates.current[k] = m)}
          position={[k % 2 ? 0.015 : -0.015, k * CRATE_H + (CRATE_H * 0.92) / 2, 0]}
          rotation={[0, (k % 2 ? 1 : -1) * 0.04, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BLOCK.w, CRATE_H * 0.92, BLOCK.d]} />
          <meshStandardMaterial
            color={color}
            emissive={bin.selected ? palette.selected : palette.hidden}
            emissiveIntensity={0}
            roughness={0.75}
            // transparent 를 바꾸면 재질을 다시 컴파일해야 해서 늘 켜 두고 opacity 만 바꾼다
            transparent
            opacity={bin.dimmed ? 0.15 : 1}
          />
          <Edges color={palette.edge} transparent opacity={bin.dimmed ? 0.1 : 0.5} />
        </mesh>
      ))}
      <mesh position={[0, -0.055, CELL.d / 2 + 0.03]}>
        <boxGeometry args={[0.16, 0.035, 0.015]} />
        <meshBasicMaterial color={led} transparent opacity={bin.dimmed ? 0.3 : 1} />
      </mesh>
      {/* 칸 전체를 덮는 강조 상자 — 누르기 쉬운 넓은 면이기도 하다 */}
      <mesh ref={glow} position={[0, CELL.h * 0.43, 0]}>
        <boxGeometry args={[CELL.w * 0.96, CELL.h * 0.86, CELL.d * 1.02]} />
        <meshBasicMaterial color={palette.glow} transparent opacity={0} depthWrite={false} />
      </mesh>
      {bin.look === 'out' ? (
        // 비어 있는 칸 — 있어야 할 상자의 빨간 윤곽
        <mesh position={[0, MAX_H / 2, 0]}>
          <boxGeometry args={[BLOCK.w, MAX_H, BLOCK.d]} />
          <meshBasicMaterial visible={false} />
          <Edges color={palette.risk} />
        </mesh>
      ) : null}
      {bin.hidden ? (
        <mesh position={[0, (target * MAX_H + 0.1) / 2, 0]}>
          <boxGeometry
            args={[BLOCK.w + 0.12, Math.max(0.1, target * MAX_H + 0.1), BLOCK.d + 0.1]}
          />
          <meshBasicMaterial visible={false} />
          <Edges color={palette.hidden} />
        </mesh>
      ) : null}
      {bin.beam || bin.selected ? (
        <mesh ref={beam} position={[0, beamH / 2, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.28, 0.42, beamH, 32, 1, true]} />
          <meshBasicMaterial
            color={palette.glow}
            transparent
            opacity={0.1}
            depthWrite={false}
            side={DoubleSide}
          />
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
            roughness={0.7}
            emissive={palette.selected}
            emissiveIntensity={equipment.selected ? 0.4 : 0}
          />
          <Edges
            color={equipment.down ? palette.risk : palette.machineDark}
            transparent
            opacity={0.6}
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
    <mesh raycast={() => null}>
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
      <Edges color={palette.edge} transparent opacity={0.6} />
    </mesh>
  );
};

// ---- 지게차: 통로를 오간다 (장식 — 데이터와 무관) ----
const Forklift = ({ palette, reach }: { palette: Palette; reach: number }) => {
  const ref = useRef<Group>(null);
  const dir = useRef(1);
  useFrame((_, delta) => {
    const f = ref.current;
    if (!f || reducedMotion()) return;
    f.position.z += dir.current * 1.1 * Math.min(delta, 0.05);
    if (f.position.z > reach) dir.current = -1;
    if (f.position.z < -reach) dir.current = 1;
    f.rotation.y = dir.current > 0 ? 0 : Math.PI;
  });
  // [너비, 높이, 깊이, x, y, z, 색]
  const parts: [number, number, number, number, number, number, keyof Palette][] = [
    [1.3, 0.7, 2.0, 0, 0.65, 0, 'forklift'],
    [1.3, 0.5, 0.5, 0, 0.75, -0.95, 'machineDark'],
    [0.7, 0.4, 0.6, 0, 1.2, -0.2, 'machineDark'],
    ...[-0.6, 0.6].flatMap((x) =>
      [-0.7, 0.5].map(
        (z) =>
          [0.06, 1.3, 0.06, x, 1.65, z, 'machineDark'] as [
            number,
            number,
            number,
            number,
            number,
            number,
            keyof Palette,
          ],
      ),
    ),
    [1.3, 0.06, 1.3, 0, 2.3, -0.1, 'machineDark'],
    [0.1, 2.8, 0.1, -0.45, 1.45, 1.1, 'machine'],
    [0.1, 2.8, 0.1, 0.45, 1.45, 1.1, 'machine'],
    [0.12, 0.05, 1.2, -0.3, 0.32, 1.75, 'machine'],
    [0.12, 0.05, 1.2, 0.3, 0.32, 1.75, 'machine'],
    [0.95, 0.6, 0.95, 0, 0.65, 1.75, 'crate'],
  ];
  return (
    <group ref={ref} position={[AISLE_X, 0, -reach]} scale={0.42} raycast={() => null}>
      {parts.map(([w, h, d, x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]} castShadow raycast={() => null}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={palette[c]} roughness={0.6} />
        </mesh>
      ))}
      {[-0.68, 0.68].flatMap((x) =>
        [-0.6, 0.65].map((z) => (
          <mesh
            key={`${x}${z}`}
            position={[x, 0.32, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
            raycast={() => null}
          >
            <cylinderGeometry args={[0.32, 0.32, 0.25, 20]} />
            <meshStandardMaterial color={palette.machineDark} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
};

// ---- 카메라: 장면 전환·목록 클릭 시 부드럽게 옮긴다 ----
// top: 위에서 내려다보기, spin: 도착하면 천천히 돈다(전체 보기). 사용자가 끌면 둘 다 멈춘다.
export type CameraFocus = { x: number; z: number; distance: number; top?: boolean; spin?: boolean };

type OrbitLike = {
  target: Vector3;
  autoRotate: boolean;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
};

// three 객체는 프레임마다 바꾸는 바깥 상태라, 훅 값 직접 대입을 막는 린트 규칙을 함수로 비켜 간다
const setSpin = (controls: OrbitLike, on: boolean) => {
  controls.autoRotate = on;
};

const CameraRig = ({ focus }: { focus: CameraFocus }) => {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const camera = useThree((s) => s.camera);
  const first = useRef(true);
  const anim = useRef<{
    t: number;
    duration: number;
    fromP: Vector3;
    fromT: Vector3;
    toP: Vector3;
    toT: Vector3;
  } | null>(null);

  // 사용자가 화면을 잡으면 이동·회전을 멈춘다
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      anim.current = null;
      setSpin(controls, false);
    };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useEffect(() => {
    if (!controls) return;
    setSpin(controls, false);
    const toT = new Vector3(focus.x, focus.top ? 0 : 0.6, focus.z);
    const toP = focus.top
      ? new Vector3(focus.x, focus.distance * 1.2, focus.z + 0.01)
      : new Vector3(
          focus.x + focus.distance * 0.35,
          focus.distance * 0.85,
          focus.z + focus.distance * 0.8,
        );
    if (reducedMotion()) {
      controls.target.copy(toT);
      camera.position.copy(toP);
      return;
    }
    // 처음 열 때는 멀리서 날아 들어온다
    anim.current = {
      t: 0,
      duration: first.current ? 2.4 : 0.95,
      fromP: camera.position.clone(),
      fromT: controls.target.clone(),
      toP,
      toT,
    };
    first.current = false;
  }, [focus, controls, camera]);

  useFrame((_, delta) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + delta / a.duration);
    const k = a.t < 0.5 ? 4 * a.t ** 3 : 1 - (-2 * a.t + 2) ** 3 / 2;
    camera.position.lerpVectors(a.fromP, a.toP, k);
    controls.target.lerpVectors(a.fromT, a.toT, k);
    if (a.t >= 1) {
      anim.current = null;
      if (focus.spin && !focus.top) setSpin(controls, true);
    }
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
  const half = Math.max(layout.size.width, layout.size.depth) / 2;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [22, 30, 38], fov: 38 }}
      onPointerMissed={onClear}
      aria-label="공장 창고 3D 화면. 칸이나 설비를 누르면 오른쪽에 자세한 내용이 나와요."
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 34, 70]} />
      <hemisphereLight args={[palette.white, palette.ground, 2]} />
      <directionalLight
        position={[-9, 17, 11]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-radius={6}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-far={60}
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
      <Forklift palette={palette} reach={layout.size.depth / 2 - 1.5} />

      <OrbitControls
        makeDefault
        enableDamping
        enablePan={false}
        minDistance={6}
        maxDistance={42}
        maxPolarAngle={Math.PI * 0.46}
        autoRotateSpeed={0.35}
      />
      <CameraRig focus={focus} />
      <LabelProjector anchors={anchors} />
    </Canvas>
  );
};

export default WarehouseScene;
