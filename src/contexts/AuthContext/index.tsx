import React, { useEffect, useReducer, useCallback, ReactElement } from 'react';
import { Auth } from 'aws-amplify';
import { toast } from 'react-toastify';
import {
  ConfirmAccountFormProps,
  ConfirmAccountValues,
  ForgotPasswordFormProps,
  ForgotPasswordValues,
  ResetPasswordFormProps,
  ResetPasswordValues,
  SignInFormProps,
  SignInValues,
  SignOutProps,
  SignUpFormProps,
  SignUpValues,
} from '../../components/types';
import { AuthMode, reducer as authReducer, actions as authActions } from './actions';
import { IAuthContext } from './types';

export const AuthContext = React.createContext<IAuthContext>(undefined);

const handleSignOut = async () => {
  await Auth.signOut();
  window.location.reload();
};

export type AuthContextProviderProps = {
  children: React.ReactNode;
  sessionPingDelay?: number;
  SignInForm: (props: SignInFormProps) => ReactElement<SignInFormProps>;
  SignUpForm: (props: SignUpFormProps) => ReactElement<SignUpFormProps>;
  SignOut: (props: SignOutProps) => ReactElement<SignOutProps>;
  ResetPasswordForm: (props: ResetPasswordFormProps) => ReactElement<ResetPasswordFormProps>;
  ForgotPasswordForm: (props: ForgotPasswordFormProps) => ReactElement<ForgotPasswordFormProps>;
  ConfirmAccountForm: (props: ConfirmAccountFormProps) => ReactElement<ConfirmAccountFormProps>;
};

export function AuthContextProvider({
  children,
  sessionPingDelay = -1,
  SignInForm,
  SignUpForm,
  SignOut,
  ResetPasswordForm,
  ForgotPasswordForm,
  ConfirmAccountForm,
}: AuthContextProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(authReducer, {
    authMode: AuthMode.SIGN_IN,
    email: '',
    session: undefined,
  });

  const switchMode = (authMode: AuthMode, email?: string) => {
    dispatch(authActions.switchMode(authMode, email));
  };

  const updateSession = useCallback(async () => {
    try {
      const currentSession = await Auth.currentSession();
      dispatch(authActions.updateSession(currentSession));
    } catch (_) {
      dispatch(authActions.updateSession(null));
    }
  }, []);

  useEffect(() => {
    updateSession();
    if (sessionPingDelay < 1) {
      return;
    }
    const timeout = setTimeout(() => {
      updateSession();
    }, sessionPingDelay * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [updateSession, sessionPingDelay]);

  const handleSignUp = async (values: SignUpValues) => {
    const result = await Auth.signUp({
      username: values.email,
      password: values.password,
      attributes: {
        email: values.email,
        given_name: values.firstName,
        family_name: values.lastName,
        'custom:allow_marketing': values.allowMarketing?.toString(),
      },
    });
    toast.success('Account created');
    if (result.userConfirmed) {
      switchMode(AuthMode.SIGN_IN, values.email);
    } else {
      switchMode(AuthMode.CONFIRM_ACCOUNT, values.email);
    }
  };

  const handleSignIn = async (values: SignInValues) => {
    try {
      await Auth.signIn(values.email, values.password);
      await updateSession();
    } catch (err) {
      if (err.code === 'UserNotConfirmedException') {
        toast.info('Account must be confirmed before signing in');
        switchMode(AuthMode.CONFIRM_ACCOUNT, values.email);
        return;
      }
      throw err;
    }
  };

  const handleForgotPassword = async (values: ForgotPasswordValues) => {
    try {
      await Auth.forgotPassword(values.email);
      switchMode(AuthMode.RESET_PASSWORD, values.email);
    } catch (err) {
      if (err.code === 'InvalidParameterException') {
        toast.info('Account must be confirmed before resetting password');
        switchMode(AuthMode.CONFIRM_ACCOUNT, values.email);
        return;
      }
      throw err;
    }
  };

  const handleResetPassword = async (values: ResetPasswordValues) => {
    await Auth.forgotPasswordSubmit(state.email, values.code, values.password);
    toast.success('Password changed');
    switchMode(AuthMode.SIGN_IN);
  };

  const handleConfirmAccount = async (values: ConfirmAccountValues) => {
    await Auth.confirmSignUp(state.email, values.code);
    toast.success('Account confirmed');
    switchMode(AuthMode.SIGN_IN);
  };

  const handleResendCode = async () => {
    await Auth.resendSignUp(state.email);
    toast.success('Email with confirmation code resent');
  };

  const signOut = useCallback(() => {
    switchMode(AuthMode.SIGN_OUT);
  }, []);

  if (state.session === undefined) {
    return null;
  }

  if (state.authMode === AuthMode.SIGN_OUT) {
    return <SignOut signOut={handleSignOut} />;
  }

  if (state.session) {
    return (
      <AuthContext.Provider
        value={{
          session: state.session,
          profile: state.profile,
          updateSession,
          signOut,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  if (state.authMode === AuthMode.SIGN_UP) {
    return <SignUpForm email={state.email} signUp={handleSignUp} switchMode={switchMode} />;
  }
  if (state.authMode === AuthMode.FORGOT_PASSWORD) {
    return <ForgotPasswordForm email={state.email} resetPassword={handleForgotPassword} switchMode={switchMode} />;
  }
  if (state.authMode === AuthMode.RESET_PASSWORD) {
    return <ResetPasswordForm email={state.email} resetPassword={handleResetPassword} />;
  }
  if (state.authMode === AuthMode.CONFIRM_ACCOUNT) {
    return (
      <ConfirmAccountForm email={state.email} confirmAccount={handleConfirmAccount} resendCode={handleResendCode} />
    );
  }

  return <SignInForm email={state.email} signIn={handleSignIn} switchMode={switchMode} />;
}
