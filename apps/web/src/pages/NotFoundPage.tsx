import { Link } from "react-router";

function NotFoundPage() {
  return (
    <>
      <h1 className="w-full bg-red-300">Lucarne NoFoundPage</h1>
      <Link to="/">Return to home</Link>;
    </>
  );
}

export default NotFoundPage;
