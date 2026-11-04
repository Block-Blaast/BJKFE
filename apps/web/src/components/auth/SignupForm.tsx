'use client';

import Link from 'next/link';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import { useSignup } from '@/hooks/auth/useAuthMutations';
import { apiErrorMessage, apiErrorStatus } from '@/utils/apiError';

const MIN_PASSWORD = 8;

// 사장님 가입·회사 생성 (F-AUTH-01)
const SignupForm = () => {
  const signup = useSignup();
  const [form, setForm] = useState({ company_name: '', name: '', email: '', password: '' });
  const [touchedPassword, setTouchedPassword] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const passwordTooShort = form.password.length > 0 && form.password.length < MIN_PASSWORD;
  const emailTaken = signup.isError && apiErrorStatus(signup.error) === 409;
  const canSubmit =
    form.company_name.trim() &&
    form.name.trim() &&
    form.email.trim() &&
    form.password.length >= MIN_PASSWORD;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        signup.mutate({
          company_name: form.company_name.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
      }}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 text-text-heading">회사 등록</h1>
        <p className="text-body-md text-text-secondary">
          사장님 계정을 만들면 직원을 초대할 수 있어요.
        </p>
      </header>
      <Input
        label="회사명"
        value={form.company_name}
        onChange={set('company_name')}
        autoComplete="organization"
        required
      />
      <Input label="이름" value={form.name} onChange={set('name')} autoComplete="name" required />
      <Input
        label="이메일"
        type="email"
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
        error={emailTaken ? apiErrorMessage(signup.error, '이미 가입된 이메일이에요.') : undefined}
        required
      />
      <Input
        label="비밀번호"
        type="password"
        value={form.password}
        onChange={set('password')}
        onBlur={() => setTouchedPassword(true)}
        autoComplete="new-password"
        helperText={`${MIN_PASSWORD}자 이상`}
        error={
          touchedPassword && passwordTooShort ? `${MIN_PASSWORD}자 이상 입력해 주세요.` : undefined
        }
        required
      />
      {signup.isError && !emailTaken ? (
        <p role="alert" className="text-body-sm text-text-danger">
          {apiErrorMessage(signup.error, '가입하지 못했어요. 잠시 후 다시 시도해 주세요.')}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={!canSubmit || signup.isPending}>
        {signup.isPending ? '등록 중…' : '회사 등록하기'}
      </Button>
      <p className="text-center text-body-sm text-text-secondary">
        이미 계정이 있으세요?{' '}
        <Link href="/login" className="text-label-md text-text-brand">
          로그인
        </Link>
      </p>
    </form>
  );
};

export default SignupForm;
