export type FieldErrors = Partial<Record<"email" | "password", string>>;

export type LoginState = {
  ok: boolean;
  error?: string;
  fieldErrors?: FieldErrors;
};

export const INITIAL_LOGIN_STATE: LoginState = { ok: true };
