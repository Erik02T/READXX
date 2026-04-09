import type { ReactElement } from "react";
import { API_BASE_URL } from "../shared/utils";

export function SidepanelApp(): ReactElement {
  return (
    <div className="readxx-sidepanel">
      <header className="readxx-sidepanel__header">
        <h1>readxx</h1>
      </header>
      <main className="readxx-sidepanel__main">
        <p>Main UI · API: {API_BASE_URL}</p>
      </main>
    </div>
  );
}
