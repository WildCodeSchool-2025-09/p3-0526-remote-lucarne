import { Outlet } from "react-router";

function App() {
  return (
    <>
      <header>Lucarne</header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;
