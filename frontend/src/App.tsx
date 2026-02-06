import { useCallback, useState } from "react";
import type { Chunk, DocumentManifest, FormulaModule, VisualModule } from "./types";
import HomePage from "./pages/HomePage";
import TutorPage from "./pages/TutorPage";

interface LoadedData {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
}

export default function App() {
  const [data, setData] = useState<LoadedData | null>(null);

  const handleLoaded = useCallback((loaded: LoadedData) => {
    setData(loaded);
  }, []);

  if (!data) {
    return <HomePage onLoaded={handleLoaded} />;
  }

  return (
    <TutorPage
      manifest={data.manifest}
      chunks={data.chunks}
      formulas={data.formulas}
      visuals={data.visuals}
    />
  );
}
