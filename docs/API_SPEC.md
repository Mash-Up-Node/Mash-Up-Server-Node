# API Spec

This document captures shared API policies for this repository.
Endpoint-specific details can be added below as APIs are implemented.

## Common Policy

### Success Response Shape

All successful responses should wrap the result in `data`.

```json
{
  "data": {}
}
```

### Error Response Shape

All failed responses should use `code` and `message`.

```json
{
  "code": "ERROR_CODE",
  "message": "에러 메시지"
}
```

## Status Codes

- `200 OK`: 조회 성공, 일반 처리 성공
- `201 Created`: 생성 성공
- `400 Bad Request`: 요청값 형식 오류, 필수값 누락
- `401 Unauthorized`: 인증 실패, 토큰 만료, 유효하지 않은 토큰
- `403 Forbidden`: 인증은 되었지만 해당 리소스에 대한 권한이 없음
- `404 Not Found`: 존재하지 않는 리소스
- `409 Conflict`: 이미 처리된 상태와 충돌
- `422 Unprocessable Entity`: 요청 형식은 올바르지만 정책상 처리 불가한 요청

## Examples

- `401 Unauthorized`: 인증 안 됨, access token 만료, refresh token 무효
- `403 Forbidden`: 권한 없는 사용자의 출석 QR 생성
- `404 Not Found`: 존재하지 않는 회원, 세미나, 초대코드
- `422 Unprocessable Entity`: 만료된 초대코드, 비활성화된 초대코드, 플랫폼 불일치

## Endpoint Details

### `POST /auth/naver/login`

Naver authorization code based login. This endpoint identifies an OAuth member;
it does not complete signup.

Request body:

```json
{
  "authorizationCode": "string",
  "authClient": "WEB"
}
```

`authClient` is optional and defaults to `WEB`. Allowed values are `WEB` and
`NATIVE`.

Signup incomplete response:

`accessToken`은 이후 `POST /auth/signup/complete`에서 가입 본인 확인에 사용한다.
가입 완료 여부에 따른 일반 보호 API 접근 정책은 signup 완료 API 작업에서 확정한다.

```json
{
  "data": {
    "memberId": 1,
    "signupCompleted": false,
    "accessToken": "...",
    "requiredFields": ["name", "platform", "inviteCode"]
  }
}
```

Signup completed WEB response:

`refreshToken`은 JSON body에 포함하지 않고 `refresh_token` HttpOnly cookie로 전달한다.

```json
{
  "data": {
    "memberId": 1,
    "signupCompleted": true,
    "accessToken": "...",
    "authClient": "WEB"
  }
}
```

Signup completed NATIVE response:

```json
{
  "data": {
    "memberId": 1,
    "signupCompleted": true,
    "accessToken": "...",
    "refreshToken": "...",
    "authClient": "NATIVE"
  }
}
```

### `GET /auth/me`

Requires `Authorization: Bearer {accessToken}`.

Response:

```json
{
  "data": {
    "memberId": 1,
    "authenticated": true,
    "signupCompleted": true,
    "name": "홍길동"
  }
}
```
