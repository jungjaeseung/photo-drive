const ID_PATTERN = /^[a-zA-Z0-9_]{2,32}$/;

export function validateLoginId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) return "아이디를 입력하세요";
  if (!ID_PATTERN.test(trimmed)) {
    return "아이디는 영문·숫자·_(2~32자)만 사용할 수 있습니다";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "비밀번호를 입력하세요";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다";
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "이름을 입력하세요";
  if (trimmed.length > 40) return "이름은 40자 이하여야 합니다";
  return null;
}
