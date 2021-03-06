import * as actions from './actions';
import { AuthMode } from './types';

describe('AuthContext actions', () => {
  describe('actions', () => {
    it('contains updateSession action', () => {
      const result = actions.actions.updateSession({
        mockSession: true,
      } as any);
      expect(result.type).toEqual('UPDATE_SESSION');
      expect(result.payload).toEqual({
        session: { mockSession: true },
      });
    });

    it('contains switchMode action', () => {
      const result = actions.actions.switchMode(AuthMode.FORGOT_PASSWORD, 'testEmail@gmail.com');
      expect(result.type).toEqual('SWITCH_MODE');
      expect(result.payload).toEqual({
        authMode: AuthMode.FORGOT_PASSWORD,
        email: 'testEmail@gmail.com',
      });
    });
  });

  describe('reducer', () => {
    it('stores session and profile in state on UPDATE_SESSION', () => {
      const newSession = {
        getIdToken: () => ({
          payload: {
            email: 'testEmail@gmail.com',
            given_name: 'Joe',
            family_name: 'Schmo',
            'custom:allow_marketing': 'true',
          },
          getJwtToken: () => 'idJwtToken',
        }),
        getAccessToken: () => ({
          getJwtToken: () => 'accessJwtToken',
        }),
      } as any;
      const result = actions.reducer(
        {
          authMode: AuthMode.SIGN_UP,
          email: 'testEmail@gmail.com',
          session: null,
        },
        actions.actions.updateSession(newSession),
      );
      expect(result).toEqual({
        authMode: AuthMode.SIGN_UP,
        email: 'testEmail@gmail.com',
        session: newSession,
        profile: {
          email: 'testEmail@gmail.com',
          firstName: 'Joe',
          lastName: 'Schmo',
          allowMarketing: true,
        },
      });
    });

    it('stores empty string for first and last name if not provided', () => {
      const newSession = {
        getIdToken: () => ({
          payload: {
            email: 'testEmail@gmail.com',
            'custom:allow_marketing': 'true',
          },
          getJwtToken: () => 'idJwtToken',
        }),
        getAccessToken: () => ({
          getJwtToken: () => 'accessJwtToken',
        }),
      } as any;
      const result = actions.reducer(
        {
          authMode: AuthMode.SIGN_UP,
          email: 'testEmail@gmail.com',
          session: null,
        },
        actions.actions.updateSession(newSession),
      );
      expect(result).toEqual({
        authMode: AuthMode.SIGN_UP,
        email: 'testEmail@gmail.com',
        session: newSession,
        profile: {
          email: 'testEmail@gmail.com',
          firstName: '',
          lastName: '',
          allowMarketing: true,
        },
      });
    });

    it('does not update session if jwt tokens are the same as current state', () => {
      const newSession = {
        getIdToken: () => ({
          payload: {
            email: 'testEmail@gmail.com',
            given_name: 'Joe',
            family_name: 'Schmo',
            'custom:allow_marketing': 'true',
          },
          getJwtToken: () => 'idJwtToken',
        }),
        getAccessToken: () => ({
          getJwtToken: () => 'accessJwtToken',
        }),
      } as any;
      const currentState = {
        authMode: AuthMode.SIGN_UP,
        email: 'testEmail@gmail.com',
        session: {
          getIdToken: () =>
            ({
              getJwtToken: () => 'idJwtToken',
            } as any),
          getAccessToken: () =>
            ({
              getJwtToken: () => 'accessJwtToken',
            } as any),
        } as any,
      };
      const result = actions.reducer(currentState, actions.actions.updateSession(newSession));
      expect(result).toEqual(currentState);
    });

    it('switches mode in state on SWITCH_MODE', () => {
      const result = actions.reducer(
        {
          authMode: AuthMode.SIGN_UP,
          email: 'testEmail@gmail.com',
          session: { oldSession: true } as any,
        },
        actions.actions.switchMode(AuthMode.SIGN_IN),
      );
      expect(result).toEqual({
        authMode: AuthMode.SIGN_IN,
        email: 'testEmail@gmail.com',
        session: { oldSession: true },
      });
    });

    it('supports including email with SWITCH_MODE', () => {
      const result = actions.reducer(
        {
          authMode: AuthMode.SIGN_UP,
          email: 'testEmail@gmail.com',
          session: { oldSession: true } as any,
        },
        actions.actions.switchMode(AuthMode.SIGN_IN, 'newEmail@gmail.com'),
      );
      expect(result).toEqual({
        authMode: AuthMode.SIGN_IN,
        email: 'newEmail@gmail.com',
        session: { oldSession: true },
      });
    });

    it('returns previous state on other action', () => {
      const result = actions.reducer(
        {
          authMode: AuthMode.SIGN_UP,
          email: 'testEmail@gmail.com',
          session: { oldSession: true } as any,
        },
        { type: 'SOMETHING_ELSE', payload: {} } as any,
      );
      expect(result).toEqual({
        authMode: AuthMode.SIGN_UP,
        email: 'testEmail@gmail.com',
        session: { oldSession: true },
      });
    });
  });
});
