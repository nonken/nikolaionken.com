import Home from "./Home";

export default function Page() {
  return <Home buildYear={new Date().getFullYear()} />;
}
