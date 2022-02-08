# react-aws-auth-context-core

React context for managing authentication flow with AWS. Provides core functionality and relies on separate libraries to implement components that match API.

## Usage

1. `yarn add @adamldoyle/react-aws-auth-context-core`
2. Configure aws-amplify Auth prior to mounting `<AuthContextProvider>`
3. Requires Cognito to be configured with:
   - email as username
   - given_name, family_name, and allow_marketing attributes (none marked as required)
4. Wrap portion of app that requires authentication in `<AuthContextProvider>` (normal usage would be to wrap entire app near the top-level) and provide components for UI (other libraries may provide an equivalent `<AuthContextProvider>` with the components already wired in)

## Component providers

The following libraries provide `<AuthContextProvider>` as well as components for the entire workflow.

- [@adamldoyle/react-aws-auth-context-mui-formik](https://github.com/adamldoyle/react-aws-auth-context-mui-formik)

## Examples

```
<AuthContextProvider
   sessionPingDelay={30}
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
         <button type="button" onClick={signOut}>Sign out</button>
      </>
   )}
   </AuthContext.Consumer>
</AuthContextProvider>
```

## Development

1. `yarn install`
2. `yarn build`

## Contributors

[Adam Doyle](https://github.com/adamldoyle)

## License

MIT
