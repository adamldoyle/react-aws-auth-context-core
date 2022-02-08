import { CognitoUserSession } from 'amazon-cognito-identity-js';

export enum AuthMode {
  SIGN_UP = 'SIGN_UP',
  CONFIRM_ACCOUNT = 'CONFIRM_ACCOUNT',
  SIGN_IN = 'SIGN_IN',
  FORGOT_PASSWORD = 'FORGOT_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD',
  SIGN_OUT = 'SIGN_OUT',
}

export interface IProfile {
  email: string;
  firstName: string;
  lastName: string;
  allowMarketing: boolean;
}

export interface IAuthContext {
  session: CognitoUserSession;
  profile: IProfile;
  updateSession: () => Promise<void>;
  signOut: () => void;
}
