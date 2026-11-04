'use client';

import Link from 'next/link';
import { useState } from 'react';

import Button from '@bjk/ui/components/Button';
import Input from '@bjk/ui/components/Input';

import { useEmailLogin } from '@/hooks/auth/useAuthMutations';
import { apiErrorMessage } from '@/utils/apiError';

// 사장님 이메일 로그인 (M-01)
const OwnerLoginForm = () => {
  const login = useEmailLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        login.mutate({ email: email.trim(), password });
      }}
    >
      <Input
        label="이메일"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        label="비밀번호"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={login.isError ? apiErrorMessage(login.error, '로그인하지 못했어요.') : undefined}
        required
      />
      <Button type="submit" size="lg" disabled={login.isPending || !email || !password}>
        {login.isPending ? '로그인 중…' : '로그인'}
      </Button>
      <p className="text-center text-body-sm text-text-secondary">
        처음이세요?{' '}
        <Link href="/signup" className="text-label-md text-text-brand">
          회사 등록하기
        </Link>
      </p>
    </form>
  );
};

export default OwnerLoginForm;
