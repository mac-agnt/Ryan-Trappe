import { useUi } from "../../demo/ui";
import CaptureSheet from "./CaptureSheet";
import InvoiceSheet from "./InvoiceSheet";
import PrintView from "./PrintView";
import { RecordSheet, SearchPalette, Toast } from "./RecordSheet";

/* Sheets and print views any page can open. */
export default function DemoOverlays({ ask }: { ask: (q: string) => void }) {
  const ui = useUi();
  return (
    <>
      {ui.record && <RecordSheet />}
      {ui.invoice && <InvoiceSheet />}
      {ui.capture && <CaptureSheet key={JSON.stringify(ui.capture)} />}
      {ui.search && <SearchPalette ask={ask} />}
      <PrintView />
      <Toast />
    </>
  );
}
