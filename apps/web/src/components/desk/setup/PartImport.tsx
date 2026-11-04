'use client';

import { CircleCheck, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { CATEGORIES, type Category } from '@bjk/api/domain/part';
import type { ImportPreview, ImportResult, ImportRow } from '@bjk/api/types/setup';
import Button from '@bjk/ui/components/Button';

import { FIELD } from '@/components/ui/controls';
import IconCircle from '@/components/ui/IconCircle';
import Tag from '@/components/ui/Tag';
import { useConfirmPartImport, useUploadPartImport } from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty, formatWon } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import SetupCard from './SetupCard';

// AI 제안 확신도가 이보다 낮으면 "확인 필요"로 표시한다. 기준값은 명세서에 없어 화면에서 정했다.
const LOW_CONFIDENCE = 0.7;

// F-SETUP-01 표
const COLUMNS: [string, '필수' | '권장' | '선택', string][] = [
  ['부품 이름', '필수', '볼베어링 6205ZZ'],
  ['현재 재고', '필수', '3'],
  ['단위', '필수', '개, 박스, L'],
  ['규격', '권장', '형번 6205, 실드 ZZ'],
  ['기본 공급사·단가', '권장', '○○베어링상사, 18,000원'],
  ['월 사용 추정치', '선택', '약 2개'],
  ['보관 위치', '선택', 'B선반 2칸'],
];

type Edit = { spec: string; category: Category | '' };

const toEdit = (row: ImportRow): Edit => ({
  spec: row.suggestion.spec ?? row.spec ?? '',
  category: row.suggestion.category ?? '',
});

// 부품 엑셀 이관 + AI 규격·카테고리 제안 검토 (F-SETUP-01·02).
// 관리자는 틀린 것만 고친다. 확신도가 낮은 줄을 위로 올린다.
const PartImport = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPartImport();
  const confirm = useConfirmPartImport();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setPreview(null);
    setEdits({});
    setAsking(false);
    upload.reset();
    confirm.reset();
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    upload.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setEdits(Object.fromEntries(data.rows.map((r) => [r.row, toEdit(r)])));
      },
    });
  };

  const rows = preview
    ? [...preview.rows].sort((a, b) => a.suggestion.confidence - b.suggestion.confidence)
    : [];
  const created = rows.filter((r) => r.action === 'create').length;

  const submit = () => {
    if (!preview) return;
    confirm.mutate(
      {
        id: preview.id,
        input: {
          rows: preview.rows.map((r) => ({
            row: r.row,
            spec: edits[r.row]?.spec.trim() || null,
            category: edits[r.row]?.category || null,
          })),
        },
      },
      {
        onSuccess: (data) => {
          setResult(data);
          reset();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {result ? (
        <div
          role="status"
          className="flex items-center gap-4 rounded-xl bg-bg-success-subtle p-6 text-text-success"
        >
          <CircleCheck size={24} aria-hidden className="shrink-0 text-icon-success" />
          <div className="flex flex-col gap-1">
            <p className="text-label-lg">
              등록을 마쳤어요. 새로 {result.created}개, 갱신 {result.updated}개.
            </p>
            {result.merge_candidates > 0 ? (
              <p className="text-body-sm text-text-body">
                같은 부품일 수 있는 쌍이 {result.merge_candidates}개 있어요.{' '}
                <Link href="/hidden-stock" className="text-label-md text-text-brand underline">
                  숨은 재고에서 합칠지 골라 주세요
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {preview ? null : (
        <SetupCard
          title="부품 엑셀 올리기"
          description="부품 이름·현재 재고·단위만 있으면 시작할 수 있어요. 같은 파일을 다시 올려도 부품이 겹쳐 생기지 않아요."
        >
          <div className="grid grid-cols-2 gap-6">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={`${TH} text-left`}>
                    열
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    필요
                  </th>
                  <th scope="col" className={`${TH} text-left`}>
                    예시
                  </th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map(([name, need, example]) => (
                  <tr key={name} className={TR}>
                    <td className={`${TD} text-label-md text-text-heading`}>{name}</td>
                    <td className={`${TD} text-text-body`}>{need}</td>
                    <td className={`${TD} text-text-secondary`}>{example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-border-strong p-8 text-center">
              <IconCircle icon={FileSpreadsheet} tone="gradient" />
              <p className="text-body-md text-text-body">
                올리면 AI가 이름에서 규격을 뽑고 카테고리를 제안해요.
                <br />
                초기 재고는 실사조정 기록으로 장부에 들어가요.
              </p>
              <input
                ref={fileRef}
                id="part-import-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} aria-hidden />
                {upload.isPending ? '읽는 중…' : '엑셀 파일 고르기'}
              </Button>
              {upload.isError ? (
                <p role="alert" className="text-body-sm text-text-danger">
                  {apiErrorMessage(upload.error, '파일을 읽지 못했어요.')}
                </p>
              ) : null}
            </div>
          </div>
        </SetupCard>
      )}

      {preview ? (
        <SetupCard
          title={`제안 검토 — ${preview.file_name}`}
          description="틀린 규격·카테고리만 고쳐 주세요. 확신이 낮은 줄이 위에 있어요."
          action={
            <Button variant="ghost" onClick={reset} disabled={confirm.isPending}>
              다른 파일 올리기
            </Button>
          }
        >
          <div>
            <table className={TABLE}>
              <thead>
                <tr>
                  {[
                    '줄',
                    '부품',
                    '재고',
                    '규격 (AI 제안)',
                    '카테고리 (AI 제안)',
                    '확인',
                    '처리',
                  ].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`${TH} ${i === 2 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const edit = edits[row.row] ?? toEdit(row);
                  const low = row.suggestion.confidence < LOW_CONFIDENCE;
                  const setEdit = (patch: Partial<Edit>) =>
                    setEdits((prev) => ({ ...prev, [row.row]: { ...edit, ...patch } }));
                  return (
                    <tr key={row.row} className={`${TR} align-top`}>
                      <td className={`${TD} text-text-secondary tabular-nums`}>{row.row}</td>
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          <span className="text-label-md text-text-heading">{row.name}</span>
                          <span className="text-label-sm text-text-secondary">
                            {[
                              row.supplier
                                ? `${row.supplier.name}${row.supplier.unit_price === null ? '' : ` ${formatWon(row.supplier.unit_price)}`}`
                                : null,
                              row.location,
                              row.monthly_estimate === null
                                ? null
                                : `월 약 ${formatQty(row.monthly_estimate, row.unit)}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          {row.duplicate_of ? (
                            <span className="text-label-sm text-text-warning">
                              ‘{row.duplicate_of.name}’과 같은 부품일 수 있어요
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${TD} text-right text-text-heading tabular-nums`}>
                        {formatQty(row.stock, row.unit)}
                      </td>
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          <input
                            aria-label={`${row.name} 규격`}
                            className={`${FIELD} w-full`}
                            value={edit.spec}
                            placeholder="규격 없음"
                            onChange={(e) => setEdit({ spec: e.target.value })}
                          />
                          {Object.keys(row.suggestion.spec_fields).length > 0 ? (
                            <span className="text-label-sm text-text-secondary">
                              {Object.entries(row.suggestion.spec_fields)
                                .map(([k, v]) => `${k} ${v}`)
                                .join(' · ')}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={TD}>
                        <select
                          aria-label={`${row.name} 카테고리`}
                          className={`${FIELD} w-full`}
                          value={edit.category}
                          onChange={(e) => setEdit({ category: e.target.value as Category | '' })}
                        >
                          <option value="">정하지 않음</option>
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className={TD}>
                        {low ? (
                          <Tag tone="warning" icon={TriangleAlert}>
                            확인 필요
                          </Tag>
                        ) : (
                          <Tag tone="success" icon={CircleCheck}>
                            확신 높음
                          </Tag>
                        )}
                      </td>
                      <td className={`${TD} text-text-body`}>
                        {row.action === 'create' ? '새로 등록' : '갱신'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {asking ? (
            <div className="flex items-center justify-between gap-4 rounded-md bg-bg-brand-subtle p-4">
              <p className="text-body-md text-text-body">
                {rows.length}줄을 등록할까요? 새로 {created}개, 갱신 {rows.length - created}개예요.
                재고는 실사조정 기록으로 장부에 남아요.
              </p>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setAsking(false)}
                  disabled={confirm.isPending}
                >
                  취소
                </Button>
                <Button onClick={submit} disabled={confirm.isPending}>
                  {confirm.isPending ? '등록 중…' : '등록'}
                </Button>
              </div>
            </div>
          ) : (
            <Button className="self-end" onClick={() => setAsking(true)}>
              {rows.length}줄 등록하기
            </Button>
          )}
          {confirm.isError ? (
            <p role="alert" className="text-body-sm text-text-danger">
              {apiErrorMessage(confirm.error, '등록하지 못했어요.')}
            </p>
          ) : null}
        </SetupCard>
      ) : null}
    </div>
  );
};

export default PartImport;
