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
        Signed in as: {accounts[0]?.username}
      </p>

      <button onClick={logout}>
        Sign out
      </button>
    </div>
  );
}

export default App;