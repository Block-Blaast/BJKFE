// 인증 — 임시 계약. 명세서 F-AUTH-01·02 의 입력·예외를 화면 단위로 옮겼고 HTTP 형식은 명세서에 없다.
// 백엔드 OpenAPI 가 나오면 생성된 타입으로 교체하고, 이 파일을 지운다.
import type { Role } from '../domain/auth';

// 액세스 15분, 리프레시 14일 (F-AUTH-01). 어디에 보관할지는 백엔드와 미정 — TODO(auth)
export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

export type AuthUser = {
  id: string;
  name: string;
  role: Role;
  company: { id: string; name: string; code: string };
};

export type AuthResult = AuthTokens & { user: AuthUser };

export type SignupInput = {
  company_name: string;
  name: string;
  email: string;
  password: string; // 8자 이상
};

export type EmailLoginInput = {
  email: string;
  password: string;
};

// 이름 선택 + PIN (F-AUTH-02). 회사 코드는 초대 수락 때 기기에 저장된 값이다.
export type CompanyMember = {
  id: string;
  name: string;
  role: Role;
};

export type PinLoginInput = {
  company_code: string;
  user_id: string;
  pin: string;
};

export type Invite = {
  role: Role;
  company: { name: string; code: string };
  expires_at: string;
};

export type AcceptInviteInput = {
  name: string;
  pin: string;
};
