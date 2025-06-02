import { useAuth0 } from "@auth0/auth0-react";

export default function App() {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();

  if (!isAuthenticated) {
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <button onClick={() => loginWithRedirect()}>Log in to use Cody</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin }})}>
        Log out
      </button>

      {/* Cody widget iframe */}
      <iframe
        src="https://embed.cody.bot/9edc7c13-386b-4271-bd76-6b55ccc036ef"
        title="Cody Widget"
        style={{ border: 0, width: "100%", height: "90vh" }}
        frameBorder="0"          /* note the capital B */
        scrolling="no"
        marginHeight="0"
        marginWidth="0"
        allowFullScreen
      />

    </>
  );
}
