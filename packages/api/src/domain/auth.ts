// 역할과 권한 (F-AUTH-03). 화면에서 버튼·메뉴를 숨기는 용도이고, 실제 차단은 서버가 한다(403).

export const ROLES = ['worker', 'manager', 'owner'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  worker: '작업자',
  manager: '관리자',
  owner: '사장님',
};

export const PERMISSIONS = {
  recordAndRequest: ['worker', 'manager', 'owner'], // 출고·입고·실사·조회, 발주 요청
  approveReview: ['manager', 'owner'], // 발주 승인·수정·반려
  approveOwnRequest: ['owner'], // 본인이 올린 요청 승인
  manageMasterData: ['manager', 'owner'], // 기준 정보, 부품 병합, 실사 요청
  configureReview: ['owner'], // 검토 기준값·알림 시간 설정
  manageCompany: ['owner'], // 직원 초대·역할 변경, 회사 설정
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role, permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly Role[]).includes(role);
