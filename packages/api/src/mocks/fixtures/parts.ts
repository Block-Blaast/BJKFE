// 개발용 목업 부품. 재고는 명세서 F-REVIEW-10 예시의 S 값을 쓴다(6204 는 명세서에 없어 비워 둠).
// 오링 P-20 은 F-AUDIT-06 예시(장부상 14개).
export type MockPart = {
  part_id: string;
  part_name: string;
  spec: string | null;
  unit: string;
  stock: number | null;
  // 채팅 문장에서 이 부품을 알아보는 단어 (목업 전용 — 실제 매칭은 서버 F-MATCH-01)
  keywords: string[];
};

export const PART_FIXTURES: MockPart[] = [
  {
    part_id: 'pt-vbelt-a42',
    part_name: 'V벨트 A-42',
    spec: 'A-42',
    unit: '개',
    stock: 2,
    keywords: ['v벨트', '브이벨트'],
  },
  {
    part_id: 'pt-bolt-m8x20',
    part_name: '육각볼트 M8×20',
    spec: 'M8×20',
    unit: '개',
    stock: 40,
    keywords: ['m8', '볼트'],
  },
  {
    part_id: 'pt-bearing-6205zz',
    part_name: '볼베어링 6205ZZ',
    spec: '6205ZZ',
    unit: '개',
    stock: 3,
    keywords: ['6205'],
  },
  {
    part_id: 'pt-bearing-6204',
    part_name: '볼베어링 6204',
    spec: '6204',
    unit: '개',
    stock: null,
    keywords: ['6204'],
  },
  {
    part_id: 'pt-oring-p20',
    part_name: '오링 P-20',
    spec: 'P-20',
    unit: '개',
    stock: 14,
    keywords: ['오링', 'p-20', 'p20'],
  },
];
