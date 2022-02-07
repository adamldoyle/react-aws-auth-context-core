import * as authActions from '../contexts/AuthContext/actions';

export type SignInValues = {
  email: string;
  password: string;
};

export type SwitchModeCallback = {
  (authMode: authActions.AuthMode, email?: string): void;
};

export type SignInFormProps = {
  email: string;
  signIn: (values: SignInValues) => Promise<void>;
  switchMode: SwitchModeCallback;
};

export type SignUpValues = {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  passwordConfirm: string;
  allowMarketing?: boolean;
};

export type SignUpFormProps = {
  email: string;
  signUp: (values: SignUpValues) => Promise<void>;
  switchMode: SwitchModeCallback;
};

export type SignOutProps = {
  signOut: () => Promise<void>;
};

export type ResetPasswordValues = {
  code: string;
  password: string;
  passwordConfirm: string;
};

export type ResetPasswordFormProps = {
  email: string;
  resetPassword: (values: ResetPasswordValues) => Promise<void>;
};

export type ForgotPasswordValues = {
  email: string;
};

export type ForgotPasswordFormProps = {
  email: string;
  resetPassword: (values: ForgotPasswordValues) => Promise<void>;
  switchMode: SwitchModeCallback;
};

export type ConfirmAccountValues = {
  email: string;
  code: string;
};

export type ConfirmAccountFormProps = {
  email: string;
  confirmAccount: (values: ConfirmAccountValues) => Promise<void>;
  resendCode: () => Promise<void>;
};
