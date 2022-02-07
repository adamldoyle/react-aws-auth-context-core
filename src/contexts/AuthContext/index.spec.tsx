import { screen, act, render, waitFor, fireEvent } from '@testing-library/react';
import { Auth } from 'aws-amplify';
import {
  ConfirmAccountFormProps,
  ForgotPasswordFormProps,
  ResetPasswordFormProps,
  SignInFormProps,
  SignOutProps,
  SignUpFormProps,
} from '../../components/types';
import { AuthContext, AuthContextProvider } from './';
import { AuthMode } from './actions';

jest.useFakeTimers();
jest.mock('aws-amplify');

const buildSession = (
  email = 'testEmail@gmail.com',
  firstName = 'Joe',
  lastName = 'Schmo',
  allowMarketing = true,
  idJwtToken = 'idJwtToken',
  accessJwtToken = 'accessJwtToken',
) => ({
  getIdToken: () => ({
    payload: {
      email,
      given_name: firstName,
      family_name: lastName,
      'custom:allow_marketing': allowMarketing,
    },
    getJwtToken: () => idJwtToken,
  }),
  getAccessToken: () => ({
    getJwtToken: () => accessJwtToken,
  }),
});

describe('AuthContext', () => {
  describe('AuthContextProvider', () => {
    let oldWindowLocation;
    let SignInForm: jest.Mock;
    let SignUpForm: jest.Mock;
    let SignOut: jest.Mock;
    let ForgotPasswordForm: jest.Mock;
    let ResetPasswordForm: jest.Mock;
    let ConfirmAccountForm: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      oldWindowLocation = window.location;
      delete window.location;
      window.location = {
        reload: jest.fn(),
      } as any;
      SignInForm = jest.fn().mockReturnValue(<>Sign in</>);
      SignUpForm = jest.fn().mockReturnValue(<>Sign up</>);
      SignOut = jest.fn().mockReturnValue(<>Sign out</>);
      ForgotPasswordForm = jest.fn().mockReturnValue(<>Forgot password</>);
      ResetPasswordForm = jest.fn().mockReturnValue(<>Reset password</>);
      ConfirmAccountForm = jest.fn().mockReturnValue(<>Confirm account</>);
    });

    afterEach(() => {
      window.location = oldWindowLocation;
    });

    const renderComponent = (sessionPingDelay = undefined) => {
      return render(
        <AuthContextProvider
          sessionPingDelay={sessionPingDelay}
          SignInForm={SignInForm}
          SignUpForm={SignUpForm}
          SignOut={SignOut}
          ForgotPasswordForm={ForgotPasswordForm}
          ResetPasswordForm={ResetPasswordForm}
          ConfirmAccountForm={ConfirmAccountForm}
        >
          <AuthContext.Consumer>
            {({ session, signOut }) => (
              <>
                <span>Authenticated</span>
                <span>ID: {session.getIdToken?.().getJwtToken?.()}</span>
                <span>Access: {session.getAccessToken?.().getJwtToken?.()}</span>
                <button type="button" onClick={signOut}>
                  Sign out
                </button>
              </>
            )}
          </AuthContext.Consumer>
        </AuthContextProvider>,
      );
    };

    const renderNoSession = async () => {
      (Auth.currentSession as jest.Mock).mockRejectedValue(new Error('No session'));
      renderComponent(undefined);
      await waitFor(() => expect(screen.getByText('Sign in')));
    };

    const switchTo = (form: typeof SignInForm | typeof SignUpForm | typeof ForgotPasswordForm, authMode: AuthMode) => {
      expect(form).toBeCalled();
      const props = form.mock.calls[0][0];
      act(() => props.switchMode(authMode, 'testEmail@gmail.com'));
    };

    const lastMockProps = (mock: jest.Mock) => {
      return mock.mock.calls[mock.mock.calls.length - 1][0];
    };

    it('shows sign in screen initially when no session', async () => {
      await renderNoSession();
      await waitFor(() => expect(screen.getByText('Sign in')));
    });

    it('allows switching mode from sign in', async () => {
      await renderNoSession();
      switchTo(SignInForm, AuthMode.SIGN_UP);
      expect(screen.getByText('Sign up'));
    });

    it('allows switching mode from sign up', async () => {
      await renderNoSession();
      switchTo(SignInForm, AuthMode.SIGN_UP);
      expect(screen.getByText('Sign up'));
      switchTo(SignUpForm, AuthMode.SIGN_IN);
      expect(screen.getByText('Sign in'));
    });

    it('allows switching mode from forgot password', async () => {
      await renderNoSession();
      switchTo(SignInForm, AuthMode.FORGOT_PASSWORD);
      expect(screen.getByText('Forgot password'));
      switchTo(ForgotPasswordForm, AuthMode.SIGN_IN);
      expect(screen.getByText('Sign in'));
    });

    it('supports signing in', async () => {
      (Auth.signIn as jest.Mock).mockResolvedValue({ signInUserSession: {} });
      await renderNoSession();
      (Auth.currentSession as jest.Mock).mockResolvedValue(buildSession());
      expect(SignInForm).toBeCalled();
      const signInProps: SignInFormProps = lastMockProps(SignInForm);
      await act(() => signInProps.signIn({ email: 'testEmail@gmail.com', password: 'testPassword' }));
      await waitFor(() => expect(Auth.signIn).toBeCalledWith('testEmail@gmail.com', 'testPassword'));
      expect(screen.queryByText('Authenticated')).not.toBeNull();
    });

    it('redirects to confirm account when signing in to non confirmed account', async () => {
      (Auth.signIn as jest.Mock).mockRejectedValue({
        code: 'UserNotConfirmedException',
      });
      await renderNoSession();
      expect(SignInForm).toBeCalled();
      const signInProps: SignInFormProps = lastMockProps(SignInForm);
      await act(() => signInProps.signIn({ email: 'testEmail@gmail.com', password: 'testPassword' }));
      await waitFor(() => expect(Auth.signIn).toBeCalledWith('testEmail@gmail.com', 'testPassword'));
      expect(screen.getByText('Confirm account'));
    });

    it('supports signing up', async () => {
      (Auth.signUp as jest.Mock).mockResolvedValue({ userConfirmed: false });
      await renderNoSession();

      switchTo(SignInForm, AuthMode.SIGN_UP);

      expect(SignUpForm).toBeCalled();
      const signUpProps: SignUpFormProps = lastMockProps(SignUpForm);
      await act(() =>
        signUpProps.signUp({
          firstName: 'testFirst',
          lastName: 'testLast',
          email: 'testEmail@gmail.com',
          password: 'testPassword',
          passwordConfirm: 'testPassword',
          allowMarketing: true,
        }),
      );

      await waitFor(() =>
        expect(Auth.signUp).toBeCalledWith({
          username: 'testEmail@gmail.com',
          password: 'testPassword',
          attributes: {
            email: 'testEmail@gmail.com',
            given_name: 'testFirst',
            family_name: 'testLast',
            'custom:allow_marketing': 'true',
          },
        }),
      );
      expect(screen.getByText('Confirm account'));
    });

    it('jumps to sign in after sign up if confirmation not required', async () => {
      (Auth.signUp as jest.Mock).mockResolvedValue({ userConfirmed: true });
      await renderNoSession();
      switchTo(SignInForm, AuthMode.SIGN_UP);

      expect(SignUpForm).toBeCalled();
      const signUpProps: SignUpFormProps = lastMockProps(SignUpForm);
      await act(() =>
        signUpProps.signUp({
          firstName: 'testFirst',
          lastName: 'testLast',
          email: 'testEmail@gmail.com',
          password: 'testPassword',
          passwordConfirm: 'testPassword',
          allowMarketing: false,
        }),
      );

      await waitFor(() =>
        expect(Auth.signUp).toBeCalledWith({
          username: 'testEmail@gmail.com',
          password: 'testPassword',
          attributes: {
            email: 'testEmail@gmail.com',
            given_name: 'testFirst',
            family_name: 'testLast',
            'custom:allow_marketing': 'false',
          },
        }),
      );
      expect(screen.getByText('Sign in'));
    });

    it('supports reset password', async () => {
      (Auth.forgotPassword as jest.Mock).mockResolvedValue({});
      await renderNoSession();
      switchTo(SignInForm, AuthMode.FORGOT_PASSWORD);

      expect(ForgotPasswordForm).toBeCalled();
      const forgotPasswordForm: ForgotPasswordFormProps = lastMockProps(ForgotPasswordForm);
      await act(() => forgotPasswordForm.resetPassword({ email: 'testEmail@gmail.com' }));
      await waitFor(() => expect(Auth.forgotPassword).toBeCalledWith('testEmail@gmail.com'));

      expect(screen.getByText('Reset password'));
      expect(ResetPasswordForm).toBeCalled();
      const resetPasswordFormProps: ResetPasswordFormProps = lastMockProps(ResetPasswordForm);
      await act(() =>
        resetPasswordFormProps.resetPassword({
          code: '12345',
          password: 'testPassword',
          passwordConfirm: 'testPasswordConfirm',
        }),
      );
      await waitFor(() =>
        expect(Auth.forgotPasswordSubmit).toBeCalledWith('testEmail@gmail.com', '12345', 'testPassword'),
      );
      expect(screen.getByText('Sign in'));
    });

    it('redirects to confirm account if resetting password on unconfirmed account', async () => {
      (Auth.forgotPassword as jest.Mock).mockRejectedValue({
        code: 'InvalidParameterException',
      });
      await renderNoSession();
      switchTo(SignInForm, AuthMode.FORGOT_PASSWORD);

      expect(ForgotPasswordForm).toBeCalled();
      const forgotPasswordForm: ForgotPasswordFormProps = lastMockProps(ForgotPasswordForm);
      await act(() => forgotPasswordForm.resetPassword({ email: 'testEmail@gmail.com' }));
      await waitFor(() => expect(screen.getByText('Confirm account')));
    });

    it('passes back other errors when resetting password', async () => {
      (Auth.forgotPassword as jest.Mock).mockRejectedValue(new Error('testError'));
      await renderNoSession();
      switchTo(SignInForm, AuthMode.FORGOT_PASSWORD);

      expect(ForgotPasswordForm).toBeCalled();
      const forgotPasswordForm: ForgotPasswordFormProps = lastMockProps(ForgotPasswordForm);
      try {
        await act(() => forgotPasswordForm.resetPassword({ email: 'testEmail@gmail.com' }));
      } catch (err) {
        expect(err.message).toEqual('testError');
      }
    });

    it('supports confirming account', async () => {
      (Auth.signIn as jest.Mock).mockRejectedValue({
        code: 'UserNotConfirmedException',
      });
      await renderNoSession();

      const signInFormProps: SignInFormProps = lastMockProps(SignInForm);
      await act(() => signInFormProps.signIn({ email: 'testEmail@gmail.com', password: 'testPassword' }));
      await waitFor(() => expect(Auth.signIn).toBeCalledWith('testEmail@gmail.com', 'testPassword'));

      expect(screen.getByText('Confirm account'));
      const confirmAccountFormProps: ConfirmAccountFormProps = lastMockProps(ConfirmAccountForm);
      await act(() => confirmAccountFormProps.confirmAccount({ code: '12345', email: 'testEmail@gmail.com' }));
      await waitFor(() => expect(Auth.confirmSignUp).toBeCalledWith('testEmail@gmail.com', '12345'));
      expect(screen.getByText('Sign in'));
    });

    it('supports resending code', async () => {
      (Auth.signIn as jest.Mock).mockRejectedValue({
        code: 'UserNotConfirmedException',
      });
      await renderNoSession();

      const signInFormProps: SignInFormProps = lastMockProps(SignInForm);
      await act(() => signInFormProps.signIn({ email: 'testEmail@gmail.com', password: 'testPassword' }));
      await waitFor(() => expect(Auth.signIn).toBeCalledWith('testEmail@gmail.com', 'testPassword'));

      expect(screen.getByText('Confirm account'));
      const confirmAccountFormProps: ConfirmAccountFormProps = lastMockProps(ConfirmAccountForm);
      await act(() => confirmAccountFormProps.resendCode());
      await waitFor(() => expect(Auth.resendSignUp).toBeCalledWith('testEmail@gmail.com'));
    });

    it('renders children if already signed in', async () => {
      (Auth.currentSession as jest.Mock).mockResolvedValue(buildSession());
      renderComponent();
      await waitFor(() => expect(screen.queryByText('Authenticated')).not.toBeNull());
    });

    it('keeps session up to date if sessionPingDelay provided', async () => {
      (Auth.currentSession as jest.Mock).mockResolvedValue(
        buildSession(undefined, undefined, undefined, undefined, 'idToken1', 'accessToken1'),
      );
      renderComponent(1);
      await waitFor(() => expect(screen.queryByText('ID: idToken1')).not.toBeNull());
      expect(screen.queryByText('Access: accessToken1')).not.toBeNull();
      (Auth.currentSession as jest.Mock).mockResolvedValue(
        buildSession(undefined, undefined, undefined, undefined, 'idToken2', 'accessToken2'),
      );
      jest.runAllTimers();
      await waitFor(() => expect(screen.queryByText('ID: idToken2')).not.toBeNull());
      expect(screen.queryByText('Access: accessToken2')).not.toBeNull();
    });

    it('handles signing out', async () => {
      (Auth.currentSession as jest.Mock).mockResolvedValue(buildSession());
      renderComponent();
      await waitFor(() => expect(screen.queryByText('Authenticated')).not.toBeNull());
      fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
      expect(SignOut).toBeCalled();
      const signOutProps: SignOutProps = lastMockProps(SignOut);
      await act(() => signOutProps.signOut());
      expect(Auth.signOut).toBeCalled();
    });
  });
});
