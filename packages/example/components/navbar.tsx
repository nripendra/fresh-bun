type NavbarProps = {
  isLoggedIn: boolean;
  loginName: string | null;
};
export function Navbar({ isLoggedIn, loginName }: NavbarProps) {
  return (
    <div id="navbar" className="navbar fixed top-0 bg-base-100 shadow-xl">
      <div className="flex-1">
        <a className="btn btn-ghost text-xl" href="/">
          My Site
        </a>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <WelcomeText isLoggedIn={isLoggedIn} loginName={loginName} />
          <li>
            <LoginOrLogout isLoggedIn={isLoggedIn} loginName={loginName} />
          </li>
        </ul>
      </div>
      {/* <script dangerouslySetInnerHTML={{__html: "alert('navbar')"}} /> */}
    </div>
  );
}
function WelcomeText({ isLoggedIn, loginName }: NavbarProps) {
  if (isLoggedIn) {
    return <li className={"pt-2"}>Welcome {loginName}</li>;
  }
  return null;
}

function LoginOrLogout({ isLoggedIn }: NavbarProps) {
  if (isLoggedIn) {
    return (
      <form method={"POST"} action={"/api/logout"} className={"p-0 ml-3"}>
        <button className={"btn btn-sm"}>Logout</button>
      </form>
    );
  } else {
    return (
      <a href={"/login"} className={"link"} hx-boost="true" hx-target="#main">
        Login
      </a>
    );
  }
}
