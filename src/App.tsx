import { DevGotchiCard } from "./components/DevGotchiCard";
import { devGotchiMock } from "./mocks/devgotchi.mock";

function App() {
  return (
    <main className="app-shell">
      <DevGotchiCard data={devGotchiMock.data} />
    </main>
  );
}

export default App;
