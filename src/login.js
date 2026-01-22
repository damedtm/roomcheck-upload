import { useAuth } from "react-oidc-context";

export default function Login() {
  const auth = useAuth();

  if (auth.isLoading) return <p>Loading...</p>;
  if (auth.error) return <p>Error: {auth.error.message}</p>;

  return (
    <div>
      <h2>Room Check Login</h2>
      <button onClick={() => auth.signinRedirect()}>
        Sign in
      </button>
    </div>
  );
}
