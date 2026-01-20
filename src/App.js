import { useAuth } from "react-oidc-context";

function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return <p>Loading...</p>;
  }

  if (auth.error) {
    return <p>Error: {auth.error.message}</p>;
  }

  if (auth.isAuthenticated) {
    return (
      <div>
        <h2>Signed in</h2>
        <p>Email: {auth.user?.profile.email}</p>
        <button onClick={() => auth.removeUser()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Room Check Login</h2>
      <button onClick={() => auth.signinRedirect()}>
        Sign in
      </button>
    </div>
  );
}

export default App;
