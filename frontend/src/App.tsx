import {
  useMsal,
  useIsAuthenticated
} from "@azure/msal-react";

import { loginRequest } from "./authConfig";

function App() {
  const { instance, accounts } = useMsal();

  const isAuthenticated = useIsAuthenticated();

  const login = () => {
    instance.loginRedirect(loginRequest);
  };

  const logout = () => {
    instance.logoutRedirect();
  };

  if (!isAuthenticated) { // TODO: Create login page with redirect to Microsoft login
    return (
      <button onClick={login}>
        Sign in with Microsoft
      </button>
    );
  }

  return (
    <div>
        <h1>Welcome</h1>

        <p>
            Signed in as: {accounts[0]?.username}<br/>
        </p>
        <h3>Account Information</h3> {/* DEBUG */}
        <p>
            homeAccountId: {accounts[0]?.homeAccountId}<br/>
            environment: {accounts[0]?.environment}<br/>
            tenantId: {accounts[0]?.tenantId}<br/>
            username: {accounts[0]?.username}<br/>
            localAccountId: {accounts[0]?.localAccountId}<br/>
            name: {accounts[0]?.name}<br/>
            authorityType: {accounts[0]?.authorityType}<br/>
        </p>

        <h4>ID Token Claims</h4> {/* DEBUG */}
        <pre>
            {JSON.stringify(accounts[0]?.idTokenClaims, null, 4)}
        </pre>

      <button onClick={logout}>
        Sign out
      </button>
      <div>
        {/* Send post request to /api/v1/auth with token */}
        <button onClick={async () => {
          const token = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
          });
          if (token) {
            await fetch("http://localhost:8000/api/v1/auth", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                token: token.accessToken
              })
            });
          }
        }}>
          DEBUG: Send token to backend
        </button>
      </div>
    </div>
  );
}

export default App;