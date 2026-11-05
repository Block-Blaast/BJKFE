'use client';

import { Ban, CircleCheck, FileSpreadsheet, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  IMPORT_FILE_ACCEPT,
  IMPORT_ROW_ERRORS,
  IMPORT_ROW_WARNINGS,
  SPEC_KEY_LABELS,
} from '@bjk/api/domain/partImport';
import type {
  CategoryOption,
  ConfirmImportInput,
  ImportPreview,
  ImportResult,
  ImportRow,
} from '@bjk/api/types/setup';
import Button from '@bjk/ui/components/Button';

import Select from '@/components/ui/Select';
import { FIELD } from '@/components/ui/controls';
import IconCircle from '@/components/ui/IconCircle';
import Tag from '@/components/ui/Tag';
import { TABLE, TD, TH, TR } from '@/components/ui/table';
import { useCategories, useConfirmPartImport, useUploadPartImport } from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty } from '@/utils/format';

import SetupCard from './SetupCard';

// AI 제안 확신도가 이보다 낮으면 "확인 필요"로 표시한다. 기준값은 명세서에 없어 화면에서 정했다.
const LOW_CONFIDENCE = 0.7;

// F-SETUP-01 표. 열 이름은 서버가 공백을 무시하고 여러 이름(부품명·품명 …)을 받아 준다.
const COLUMNS: [string, '필수' | '권장' | '선택', string][] = [
  ['부품 이름', '필수', '볼베어링 6205ZZ'],
  ['현재 재고', '필수', '3'],
  ['단위', '필수', '개, 박스, L'],
  ['규격', '권장', '형번 6205, 실드 ZZ'],
  ['기본 공급사·단가', '권장', '○○베어링상사, 18,000원'],
  ['월 사용 추정치', '선택', '약 2개'],
  ['보관 위치', '선택', 'B선반 2칸'],
];

// merge: 새로 만들지 않고 합칠 기존 부품 id (중복 의심 줄만, '' = 새로 등록)
type Edit = { spec: Record<string, string>; categoryId: string; merge: string };

const toEdit = (row: ImportRow): Edit => ({
  spec: row.spec,
  categoryId: row.suggested_category?.id ?? '',
  merge: '',
});

const sameSpec = (a: Record<string, string>, b: Record<string, string>) =>
  Object.keys(a).length === Object.keys(b).length &&
  Object.entries(a).every(([k, v]) => b[k] === v);

// 값을 지운 규격 키는 빼고 보낸다
const cleanSpec = (spec: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(spec)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v),
  );

const toConfirmRow = (row: ImportRow, edit: Edit): ConfirmImportInput['rows'][number] => {
  const spec = cleanSpec(edit.spec);
  return {
    row: row.row,
    ...(edit.categoryId ? { category_id: edit.categoryId } : {}),
    // 고치지 않은 규격은 비워 보내 서버가 SET-01 제안 값을 쓰게 한다
    ...(sameSpec(spec, row.spec) ? {} : { spec }),
    ...(edit.merge ? { merge_with_part_id: edit.merge } : {}),
  };
};

type Done = ImportResult & { reimport: boolean };

// 부품 엑셀 이관 + AI 규격·카테고리 제안 검토 (F-SETUP-01·02, 백엔드 SET-01·02).
// 관리자는 틀린 것만 고친다. 서버가 오류 줄 → 확신도 낮은 줄 순으로 올려 준다.
const PartImport = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPartImport();
  const confirm = useConfirmPartImport();
  const categories = useCategories();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [asking, setAsking] = useState(false);
  const [result, setResult] = useState<Done | null>(null);

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
    setFileName(file.name);
    upload.mutate(file, {
      onSuccess: (data) => {
        setPreview(data);
        setEdits(Object.fromEntries(data.rows.map((r) => [r.row, toEdit(r)])));
      },
    });
  };

  const rows = preview?.rows ?? [];
  const valid = rows.filter((r) => r.errors.length === 0);
  const editOf = (row: ImportRow) => edits[row.row] ?? toEdit(row);
  const created = valid.filter((r) => !r.existing_part_id && !editOf(r).merge).length;

  // 회사 카테고리 목록을 못 받아도 AI 가 제안한 카테고리는 고를 수 있게 한다
  const optionsFor = (row: ImportRow): CategoryOption[] => {
    const list = categories.data ?? [];
    const suggested = row.suggested_category;
    return suggested && !list.some((c) => c.id === suggested.id)
      ? [{ id: suggested.id, name: suggested.name }, ...list]
      : list;
  };

  const submit = () => {
    if (!preview) return;
    confirm.mutate(
      {
        id: preview.import_id,
        input: { rows: valid.map((r) => toConfirmRow(r, editOf(r))) },
      },
      {
        onSuccess: (data) => {
          setResult({ ...data, reimport: preview.is_reimport });
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
            <p className="text-body-sm text-text-body">
              {result.adjust_movements > 0
                ? `시작 재고 ${result.adjust_movements}건을 실사조정 기록으로 남겼어요.`
                : '재고 기록은 바꾸지 않았어요.'}
              {result.reimport ? ' 이미 있던 부품의 재고는 그대로 두었어요.' : ''}
            </p>
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
                엑셀(.xlsx)·CSV 파일, 5MB·1,000줄까지 올릴 수 있어요.
              </p>
              <input
                ref={fileRef}
                id="part-import-file"
                type="file"
                accept={IMPORT_FILE_ACCEPT}
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
          title={`제안 검토 — ${fileName}`}
          description="틀린 규격·카테고리만 고쳐 주세요. 확인이 필요한 줄이 위에 있어요."
          action={
            <Button variant="ghost" onClick={reset} disabled={confirm.isPending}>
              다른 파일 올리기
            </Button>
          }
        >
          {preview.ai.fallback ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md bg-bg-warning-subtle p-4 text-body-md text-text-warning"
            >
              <TriangleAlert size={16} aria-hidden className="shrink-0 text-icon-warning" />
              AI 제안을 받지 못했어요. 규격은 이름에서 찾은 값만 넣었으니 카테고리를 직접 골라
              주세요.
            </p>
          ) : null}

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
                  const edit = editOf(row);
                  const blocked = row.errors.length > 0;
                  const low = (row.suggested_category?.confidence ?? 0) < LOW_CONFIDENCE;
                  const setEdit = (patch: Partial<Edit>) =>
                    setEdits((prev) => ({ ...prev, [row.row]: { ...edit, ...patch } }));
                  const specKeys = Object.keys(edit.spec);
                  return (
                    <tr key={row.row} className={`${TR} align-top`}>
                      <td className={`${TD} text-text-secondary tabular-nums`}>{row.row}</td>
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          <span className="text-label-md text-text-heading">
                            {row.name || '(이름 없음)'}
                          </span>
                          {row.errors.map((code) => (
                            <span key={code} className="text-label-sm text-text-danger">
                              {IMPORT_ROW_ERRORS[code]}
                            </span>
                          ))}
                          {row.warnings.map((code) => (
                            <span key={code} className="text-label-sm text-text-warning">
                              {IMPORT_ROW_WARNINGS[code]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className={`${TD} text-right text-text-heading tabular-nums`}>
                        {row.stock === null ? '—' : formatQty(row.stock, row.unit)}
                      </td>
                      <td className={TD}>
                        {specKeys.length === 0 ? (
                          <span className="text-body-sm text-text-secondary">규격 없음</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {specKeys.map((key) => (
                              <label key={key} className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-label-sm text-text-secondary">
                                  {SPEC_KEY_LABELS[key] ?? key}
                                </span>
                                <input
                                  aria-label={`${row.name} 규격 ${SPEC_KEY_LABELS[key] ?? key}`}
                                  className={`${FIELD} w-full`}
                                  value={edit.spec[key]}
                                  disabled={blocked}
                                  onChange={(e) =>
                                    setEdit({ spec: { ...edit.spec, [key]: e.target.value } })
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className={TD}>
                        <Select
                          aria-label={`${row.name} 카테고리`}
                          variant="field"
                          className="w-full"
                          value={edit.categoryId}
                          disabled={blocked}
                          onChange={(e) => setEdit({ categoryId: e.target.value })}
                        >
                          <option value="">정하지 않음</option>
                          {optionsFor(row).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={TD}>
                        {blocked ? (
                          <Tag tone="danger" icon={Ban}>
                            등록 안 함
                          </Tag>
                        ) : low ? (
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
                        {blocked ? (
                          '—'
                        ) : row.existing_part_id ? (
                          '갱신'
                        ) : row.duplicate_suspects.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            <Select
                              aria-label={`${row.name} 처리`}
                              variant="field"
                              className="w-full"
                              value={edit.merge}
                              onChange={(e) => setEdit({ merge: e.target.value })}
                            >
                              <option value="">새로 등록</option>
                              {row.duplicate_suspects.map((s) => (
                                <option key={s.part_id} value={s.part_id}>
                                  ‘{s.name}’에 합치기
                                </option>
                              ))}
                            </Select>
                            <span className="text-label-sm text-text-warning">
                              같은 부품일 수 있어요
                            </span>
                          </div>
                        ) : (
                          '새로 등록'
                        )}
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
                {valid.length}줄을 등록할까요? 새로 {created}개, 갱신 {valid.length - created}
                개예요.
                {rows.length > valid.length
                  ? ` 오류가 있는 ${rows.length - valid.length}줄은 빼요.`
                  : ''}{' '}
                {preview.is_reimport
                  ? '이미 있는 부품의 재고는 바꾸지 않고, 새 부품만 시작 재고를 실사조정 기록으로 남겨요.'
                  : '재고는 실사조정 기록으로 재고 기록에 남아요.'}
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
            <Button
              className="self-end"
              onClick={() => setAsking(true)}
              disabled={valid.length === 0}
            >
              {valid.length}줄 등록하기
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
