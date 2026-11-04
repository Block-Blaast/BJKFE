import { NextResponse, userAgent, type NextRequest } from 'next/server';

// 폰은 앱 화면(/m/*), PC·태블릿은 웹 화면으로 보낸다 (명세서 15장).
// 같은 대상을 가리키는 화면(검토 상세 M-05 ↔ W-03)은 기기에 맞는 쪽으로 옮겨서, 푸시·공유 링크가 어느 기기에서 열려도 맞는 화면이 뜨게 한다.
// TODO(auth): 로그인 연동 후 미인증이면 /login, 첫 화면은 역할별(작업자 /m/chat, 사장님 폰 /m/briefing)로 바꾼다.

const isPhone = (request: NextRequest) => userAgent(request).device.type === 'mobile';

const redirectTo = (request: NextRequest, pathname: string) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  return NextResponse.redirect(url);
};

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const phone = isPhone(request);

  if (pathname === '/') {
    return redirectTo(request, phone ? '/m/chat' : '/dashboard');
  }

  const deskReview = pathname.match(/^\/reviews\/([^/]+)$/);
  if (deskReview && phone) {
    return redirectTo(request, `/m/reviews/${deskReview[1]}`);
  }

  const mobileReview = pathname.match(/^\/m\/reviews\/([^/]+)$/);
  if (mobileReview && !phone) {
    return redirectTo(request, `/reviews/${mobileReview[1]}`);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/', '/reviews/:id', '/m/reviews/:id'],
};
