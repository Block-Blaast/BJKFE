// 개발용 목업 — 로그인 화면을 눌러 보기 위한 테스트 계정. 실제 계정·비밀번호가 아니다.
// 명세서에 직원 이름 예시가 없어 시연용 가상 이름을 쓴다 (v2 가상 공장, fixtures/factory.ts).
import type { Role } from '../../domain/auth';

export const MOCK_COMPANY = { id: 'co-demo', name: '한빛정밀', code: 'DEMO01' };

export type MockMember = { id: string; name: string; role: Role; pin: string };

export const MOCK_MEMBERS: MockMember[] = [
  { id: 'us-worker-1', name: '김민수', role: 'worker', pin: '1234' },
  { id: 'us-worker-2', name: '이지훈', role: 'worker', pin: '1234' },
  { id: 'us-manager-1', name: '박서연', role: 'manager', pin: '1234' },
];

export const MOCK_OWNER = {
  id: 'us-owner',
  name: '사장님',
  email: 'owner@example.com',
  password: 'password123',
};

// 초대 토큰 — 유효 / 관리자 초대 / 이미 사용 / 만료
export const MOCK_INVITES: Record<string, { role: Role; used: boolean; expired: boolean }> = {
  'demo-invite': { role: 'worker', used: false, expired: false },
  'manager-invite': { role: 'manager', used: false, expired: false },
  'used-invite': { role: 'worker', used: true, expired: false },
  'expired-invite': { role: 'worker', used: false, expired: true },
};
