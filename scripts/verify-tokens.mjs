// tokens.css 가 디자인 시스템 표(Figma sJfs73BOfgYtBrAB3Xx8si)와 정확히 같은지 대조한다. `pnpm lint` 에 포함된다.
// Figma 값을 바꾸면 이 파일의 기대값을 먼저 고치고, tokens.css 를 맞춘다.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(path.join(root, 'packages/ui/src/tokens.css'), 'utf8');

const PRIMITIVES = {
  'brand-50': '#EAF4FF',
  'brand-100': '#D3E8FF',
  'brand-200': '#A9D2FF',
  'brand-300': '#6FB4FF',
  'brand-400': '#2F96FF',
  'brand-500': '#0E7DFF',
  'brand-600': '#0A68DB',
  'brand-700': '#0A53B3',
  'brand-800': '#0B4190',
  'brand-900': '#0A2F6B',
  'sub-50': '#FFFAE3',
  'sub-100': '#FEF5C1',
  'sub-300': '#FDE661',
  'sub-500': '#FBD725',
  'sub-600': '#F0BE00',
  'sub-700': '#7A5C00',
  'sub-900': '#3D2E00',
  'gray-0': '#FFFFFF',
  'gray-50': '#F7F8FA',
  'gray-100': '#F1F3F6',
  'gray-200': '#E4E7EC',
  'gray-300': '#D0D5DD',
  'gray-400': '#98A2B3',
  'gray-500': '#667085',
  'gray-600': '#475467',
  'gray-700': '#344054',
  'gray-800': '#1D2939',
  'gray-900': '#101828',
  'red-50': '#FFE9EC',
  'red-500': '#F2415A',
  'red-700': '#B8132F',
  'green-50': '#E2F7EA',
  'green-500': '#22B573',
  'green-700': '#0A7A47',
  'orange-50': '#FFEBD6',
  'orange-500': '#FF8A1F',
  'orange-700': '#A34700',
};

const SEMANTIC = {
  'bg-page': 'gray-50',
  'bg-surface': 'gray-0',
  'bg-subtle': 'gray-100',
  'bg-brand': 'brand-600',
  'bg-brand-hover': 'brand-700',
  'bg-brand-pressed': 'brand-800',
  'bg-brand-subtle': 'brand-50',
  'bg-brand-subtle-hover': 'brand-100',
  'bg-brand-subtle-pressed': 'brand-200',
  'bg-sub': 'sub-500',
  'bg-sub-subtle': 'sub-50',
  'bg-disabled': 'gray-200',
  'bg-danger-subtle': 'red-50',
  'bg-success-subtle': 'green-50',
  'bg-warning-subtle': 'orange-50',
  'text-heading': 'gray-800',
  'text-body': 'gray-700',
  'text-secondary': 'gray-500',
  'text-placeholder': 'gray-500',
  'text-disabled': 'gray-400',
  'text-on-brand': 'gray-0',
  'text-brand': 'brand-700',
  'text-sub': 'sub-700',
  'text-danger': 'red-700',
  'text-success': 'green-700',
  'text-warning': 'orange-700',
  'border-default': 'gray-200',
  'border-strong': 'gray-300',
  'border-brand': 'brand-600',
  'border-danger': 'red-500',
  'icon-brand': 'brand-700',
  'icon-danger': 'red-700',
  'icon-success': 'green-700',
  'icon-warning': 'orange-700',
};

const OTHER = {
  '--radius-md': '12px',
  '--shadow-card': '0 4px 12px rgb(16 24 40 / 0.08)',
  '--shadow-raised': '0 8px 24px rgb(16 24 40 / 0.12)',
};

// [size, line-height, weight, letter-spacing]
const TYPOGRAPHY = {
  display: ['40px', '52px', '700', '-0.01em'],
  h1: ['32px', '44px', '700', '-0.01em'],
  h2: ['24px', '34px', '700', '-0.01em'],
  h3: ['20px', '28px', '700', '0'],
  'body-lg': ['18px', '28px', '400', '0'],
  'body-md': ['16px', '24px', '400', '0'],
  'body-sm': ['14px', '20px', '400', '0'],
  'label-lg': ['16px', '20px', '500', '0'],
  'label-md': ['14px', '20px', '500', '0'],
  'label-sm': ['12px', '16px', '500', '0'],
};

// 선언을 모두 모은다. 같은 이름이 두 번 선언되면 그것도 오류다.
const decls = new Map();
const errors = [];
for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  if (name.endsWith('-*')) continue;
  if (decls.has(name)) errors.push(`${name} 가 두 번 선언됨`);
  decls.set(name, value.trim());
}

const expect = (name, value, normalize = (v) => v) => {
  if (!decls.has(name)) return errors.push(`${name} 누락`);
  const actual = decls.get(name);
  if (normalize(actual) !== normalize(value)) {
    errors.push(`${name}: 기대 ${value}, 실제 ${actual}`);
  }
};

// hex 는 대소문자만 다른 경우를 같은 값으로 본다(Prettier 등 도구가 바꿀 수 있음).
for (const [name, hex] of Object.entries(PRIMITIVES)) {
  expect(`--color-${name}`, hex, (v) => v.toUpperCase());
}
for (const [name, primitive] of Object.entries(SEMANTIC)) {
  expect(`--${name}`, `var(--color-${primitive})`);
  expect(`--color-${name}`, `var(--${name})`);
}
for (const [name, value] of Object.entries(OTHER)) expect(name, value);
for (const [name, [size, lh, weight, ls]] of Object.entries(TYPOGRAPHY)) {
  expect(`--text-${name}`, size);
  expect(`--text-${name}--line-height`, lh);
  expect(`--text-${name}--font-weight`, weight);
  expect(`--text-${name}--letter-spacing`, ls);
}

// 표에 없는 토큰이 끼어들지 않았는지 확인한다.
const known = new Set([
  ...Object.keys(PRIMITIVES).map((n) => `--color-${n}`),
  ...Object.keys(SEMANTIC).flatMap((n) => [`--${n}`, `--color-${n}`]),
  ...Object.keys(OTHER),
  ...Object.keys(TYPOGRAPHY).flatMap((n) =>
    ['', '--line-height', '--font-weight', '--letter-spacing'].map((s) => `--text-${n}${s}`),
  ),
  '--font-sans',
]);
for (const name of decls.keys()) {
  if (!known.has(name)) errors.push(`${name}: 디자인 시스템 표에 없는 토큰`);
}

const counts = `프리미티브 ${Object.keys(PRIMITIVES).length} · 시맨틱 ${Object.keys(SEMANTIC).length} · 타이포 ${Object.keys(TYPOGRAPHY).length}`;
if (errors.length) {
  console.error(errors.map((e) => `  ${e}`).join('\n'));
  console.error(`\n✖ 토큰 불일치 ${errors.length}건 (${counts})`);
  process.exit(1);
}
console.log(`✔ 토큰 대조 일치 (${counts})`);
