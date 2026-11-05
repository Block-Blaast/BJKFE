'use client';

import { CircleCheck, CircleX, FileSpreadsheet, Info, TriangleAlert, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  IMPORT_ROW_ERROR_LABEL,
  IMPORT_ROW_WARNING_LABEL,
  SPEC_KEY_LABEL,
  type StockMode,
} from '@bjk/api/domain/setup';
import type {
  ConfirmImportRow,
  ImportPreview,
  ImportResult,
  ImportRow,
  StockDiff,
} from '@bjk/api/types/setup';
import Button from '@bjk/ui/components/Button';

import Segmented from '@/components/ui/Segmented';
import Select from '@/components/ui/Select';
import { FIELD } from '@/components/ui/controls';
import IconCircle from '@/components/ui/IconCircle';
import Tag from '@/components/ui/Tag';
import { useCategories, useConfirmPartImport, useUploadPartImport } from '@/hooks/setup/useSetup';
import { apiErrorMessage } from '@/utils/apiError';
import { formatQty } from '@/utils/format';
import { TABLE, TD, TH, TR } from '@/components/ui/table';

import QueryStatus from './QueryStatus';
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

// 재이관에서 고르는 재고 처리. preview 를 고르면 차이를 본 뒤 apply 로 확정한다
type ReimportMode = Extract<StockMode, 'ignore' | 'preview'>;
const REIMPORT_MODES: [ReimportMode, string][] = [
  ['ignore', '재고는 그대로'],
  ['preview', '파일 재고로 맞추기'],
];

type Edit = {
  selected: boolean;
  categoryId: string;
  spec: Record<string, string>;
  specEdited: boolean;
  mergeWith: string; // 합칠 기존 부품 id. 비우면 새로 등록(또는 같은 부품 갱신)
};

const toEdit = (row: ImportRow): Edit => ({
  selected: row.errors.length === 0,
  categoryId: row.suggested_category?.id ?? '',
  spec: row.spec,
  specEdited: false,
  mergeWith: '',
});

const specLabel = (key: string) => SPEC_KEY_LABEL[key] ?? key;

const toConfirmRow = (row: ImportRow, edit: Edit): ConfirmImportRow => ({
  row: row.row,
  // 비워 보내면 서버가 AI 제안 카테고리를 쓴다
  category_id: edit.categoryId || null,
  // 고치지 않은 규격은 보내지 않는다 — 서버가 미리보기 규격을 그대로 쓴다
  ...(edit.specEdited ? { spec: edit.spec } : {}),
  merge_with_part_id: edit.mergeWith || null,
});

// 부품 엑셀 이관 + AI 규격·카테고리 제안 검토 (F-SETUP-01·02, 백엔드 SET-01·02).
// 관리자는 틀린 것만 고친다. 줄 순서는 서버가 정한다(오류 줄 → 확신도 낮은 줄 → 파일 순서).
const PartImport = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPartImport();
  const confirm = useConfirmPartImport();
  const categories = useCategories();
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [reimportMode, setReimportMode] = useState<ReimportMode>('ignore');
  const [asking, setAsking] = useState(false);
  // preview 결과. 줄·병합 선택이 바뀌면 다시 확인해야 해서 지운다
  const [stockDiffs, setStockDiffs] = useState<StockDiff[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => {
    setPreview(null);
    setEdits({});
    setReimportMode('ignore');
    setAsking(false);
    setStockDiffs(null);
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
  const editOf = (row: ImportRow) => edits[row.row] ?? toEdit(row);
  const chosen = rows.filter((r) => r.errors.length === 0 && editOf(r).selected);
  const updatedCount = chosen.filter((r) => r.existing_part_id || editOf(r).mergeWith).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  const updateEdit = (row: ImportRow, patch: Partial<Edit>) => {
    setEdits((prev) => ({ ...prev, [row.row]: { ...editOf(row), ...patch } }));
    setStockDiffs(null);
    confirm.reset();
  };

  // 처음 이관은 stock_mode 를 생략해 서버가 initial 로 처리하게 한다
  const send = (mode: StockMode | null) => {
    if (!preview || chosen.length === 0) return;
    confirm.mutate(
      {
        id: preview.import_id,
        input: {
          rows: chosen.map((r) => toConfirmRow(r, editOf(r))),
          ...(mode ? { stock_mode: mode } : {}),
        },
      },
      {
        onSuccess: (data) => {
          if (mode === 'preview') {
            setStockDiffs(data.stock_diffs);
            return;
          }
          setResult(data);
          reset();
        },
      },
    );
  };

  const onConfirm = () => {
    if (!preview?.is_reimport) return send(null);
    if (reimportMode === 'ignore') return send('ignore');
    return send(stockDiffs ? 'apply' : 'preview');
  };

  const confirmLabel = () => {
    if (confirm.isPending) return '처리 중…';
    if (preview?.is_reimport && reimportMode === 'preview' && !stockDiffs) return '재고 차이 확인';
    if (stockDiffs?.length) return `차이 ${stockDiffs.length}건 반영하고 등록`;
    return '등록';
  };

  const askText = () => {
    const base = `${chosen.length}줄을 등록할까요? 새로 ${chosen.length - updatedCount}개, 갱신 ${updatedCount}개예요.`;
    if (!preview?.is_reimport) return `${base} 재고는 초기 재고 조정 기록으로 재고 기록에 남아요.`;
    if (reimportMode === 'ignore') return `${base} 기존 부품의 재고는 바꾸지 않아요.`;
    if (!stockDiffs) return `${base} 먼저 장부와 파일 재고 차이를 확인해요.`;
    return stockDiffs.length
      ? `${base} 아래 차이만큼 재고 조정 기록을 남겨요.`
      : `${base} 장부와 파일 재고가 모두 같아요.`;
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
            {result.adjust_movements > 0 ? (
              <p className="text-body-sm text-text-body">
                재고 조정 기록 {result.adjust_movements}건을 남겼어요.
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
                초기 재고는 조정 기록으로 재고 기록에 들어가요.
                <br />
                xlsx·csv, 5MB·1,000줄까지 올릴 수 있어요.
              </p>
              <input
                ref={fileRef}
                id="part-import-file"
                type="file"
                accept=".xlsx,.csv"
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
          description={
            preview.is_reimport
              ? '다시 올린 파일이에요. 이미 있는 부품은 갱신하고, 재고를 어떻게 할지 골라 주세요.'
              : '틀린 규격·카테고리만 고쳐 주세요. 확신이 낮은 줄이 위에 있어요.'
          }
          action={
            <Button variant="ghost" onClick={reset} disabled={confirm.isPending}>
              다른 파일 올리기
            </Button>
          }
        >
          {preview.ai.fallback ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md bg-bg-warning-subtle p-4 text-body-sm text-text-warning"
            >
              <Info size={16} aria-hidden className="shrink-0 text-icon-warning" />
              AI 제안을 받지 못해 규칙으로 뽑은 규격만 보여 드려요. 카테고리는 직접 골라 주세요.
            </p>
          ) : null}
          {errorCount > 0 ? (
            <p className="text-body-sm text-text-danger">
              오류가 있는 {errorCount}줄은 등록할 수 없어요. 엑셀을 고쳐 다시 올려 주세요.
            </p>
          ) : null}
          <QueryStatus
            isPending={categories.isPending}
            isError={categories.isError}
            what="카테고리 목록"
            onRetry={() => categories.refetch()}
          />

          <div>
            <table className={TABLE}>
              <thead>
                <tr>
                  {[
                    '등록',
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
                      className={`${TH} ${i === 3 ? 'text-right' : 'text-left'}`}
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
                  const confidence = row.suggested_category?.confidence ?? 0;
                  const specKeys = Object.keys(edit.spec);
                  return (
                    <tr key={row.row} className={`${TR} align-top`}>
                      <td className={TD}>
                        <input
                          type="checkbox"
                          aria-label={`${row.row}줄 ${row.name || '이름 없음'} 등록`}
                          checked={!blocked && edit.selected}
                          disabled={blocked}
                          onChange={(e) => updateEdit(row, { selected: e.target.checked })}
                          className="accent-bg-brand"
                        />
                      </td>
                      <td className={`${TD} text-text-secondary tabular-nums`}>{row.row}</td>
                      <td className={TD}>
                        <div className="flex flex-col gap-1">
                          <span className="text-label-md text-text-heading">
                            {row.name || '이름 없음'}
                          </span>
                          {row.errors.map((code) => (
                            <span key={code} className="text-label-sm text-text-danger">
                              {IMPORT_ROW_ERROR_LABEL[code] ?? code}
                            </span>
                          ))}
                          {row.warnings.map((code) => (
                            <span key={code} className="text-label-sm text-text-warning">
                              {IMPORT_ROW_WARNING_LABEL[code] ?? code}
                            </span>
                          ))}
                          {!blocked && row.duplicate_suspects.length > 0 ? (
                            <Select
                              aria-label={`${row.name} 합칠 부품`}
                              variant="field"
                              className="w-full"
                              value={edit.mergeWith}
                              onChange={(e) => updateEdit(row, { mergeWith: e.target.value })}
                            >
                              <option value="">
                                {row.existing_part_id ? '같은 부품 갱신' : '새 부품으로 등록'}
                              </option>
                              {row.duplicate_suspects.map((s) => (
                                <option key={s.part_id} value={s.part_id}>
                                  ‘{s.name}’에 합치기 (
                                  {s.reason === 'spec_exact' ? '규격 같음' : '이름 비슷함'})
                                </option>
                              ))}
                            </Select>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${TD} text-right text-text-heading tabular-nums`}>
                        {row.stock === null ? '—' : formatQty(row.stock, row.unit)}
                      </td>
                      <td className={TD}>
                        {specKeys.length === 0 ? (
                          <span className="text-text-secondary">규격 없음</span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {specKeys.map((key) => (
                              <label key={key} className="flex items-center gap-2">
                                <span className="w-20 shrink-0 text-label-sm text-text-secondary">
                                  {specLabel(key)}
                                </span>
                                <input
                                  aria-label={`${row.name} ${specLabel(key)}`}
                                  className={`${FIELD} w-full`}
                                  value={edit.spec[key]}
                                  disabled={blocked}
                                  onChange={(e) =>
                                    updateEdit(row, {
                                      spec: { ...edit.spec, [key]: e.target.value },
                                      specEdited: true,
                                    })
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
                          disabled={blocked || !categories.data}
                          onChange={(e) => updateEdit(row, { categoryId: e.target.value })}
                        >
                          {/* 제안이 있으면 비워 보내도 서버가 제안을 쓰므로 "정하지 않음"을 두지 않는다 */}
                          {/* 기존 부품은 비워 보내면 지금 카테고리를 그대로 둔다 */}
                          {row.suggested_category ? null : (
                            <option value="">
                              {row.existing_part_id ? '바꾸지 않음' : '정하지 않음'}
                            </option>
                          )}
                          {row.suggested_category &&
                          !categories.data?.some((c) => c.id === row.suggested_category?.id) ? (
                            <option value={row.suggested_category.id}>
                              {row.suggested_category.name}
                            </option>
                          ) : null}
                          {(categories.data ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={TD}>
                        {blocked ? (
                          <Tag tone="danger" icon={CircleX}>
                            등록 불가
                          </Tag>
                        ) : confidence < LOW_CONFIDENCE ? (
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
                        {blocked
                          ? '—'
                          : edit.mergeWith
                            ? '합치기'
                            : row.existing_part_id
                              ? '갱신'
                              : '새로 등록'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {preview.is_reimport ? (
            <div className="flex items-center gap-4">
              <span className="text-label-md text-text-heading">기존 부품 재고</span>
              <Segmented
                label="기존 부품 재고 처리"
                options={REIMPORT_MODES}
                value={reimportMode}
                onChange={(mode) => {
                  setReimportMode(mode);
                  setStockDiffs(null);
                  confirm.reset();
                }}
              />
            </div>
          ) : null}

          {stockDiffs && stockDiffs.length > 0 ? (
            <table className={TABLE}>
              <thead>
                <tr>
                  {['줄', '부품', '장부 재고', '파일 재고', '차이'].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`${TH} ${i < 2 ? 'text-left' : 'text-right'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stockDiffs.map((d) => (
                  <tr key={d.row} className={TR}>
                    <td className={`${TD} text-text-secondary tabular-nums`}>{d.row}</td>
                    <td className={`${TD} text-label-md text-text-heading`}>{d.name}</td>
                    <td className={`${TD} text-right tabular-nums`}>{d.ledger_stock}</td>
                    <td className={`${TD} text-right tabular-nums`}>{d.file_stock}</td>
                    <td
                      className={`${TD} text-right tabular-nums ${d.diff < 0 ? 'text-text-danger' : 'text-text-success'}`}
                    >
                      {d.diff > 0 ? `+${d.diff}` : d.diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {asking ? (
            <div className="flex items-center justify-between gap-4 rounded-md bg-bg-brand-subtle p-4">
              <p className="text-body-md text-text-body">{askText()}</p>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAsking(false);
                    setStockDiffs(null);
                  }}
                  disabled={confirm.isPending}
                >
                  취소
                </Button>
                <Button onClick={onConfirm} disabled={confirm.isPending}>
                  {confirmLabel()}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              className="self-end"
              disabled={chosen.length === 0}
              onClick={() => setAsking(true)}
            >
              {chosen.length}줄 등록하기
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
