import type { CSSProperties } from 'react';

// Container style for the reader column. The reader renders text with
// fixed-px classes, so scaling via inherited font-size leaves nearly all
// text unmoved (the header Aa control appears dead). `zoom` scales px
// text and layout together, which is exactly what the control promises.
// The independent character-size control keeps working: it sizes Chinese
// spans in em, compounding on top of the zoomed size.
export function readerContainerStyle(fontScale: number): CSSProperties {
  return { zoom: fontScale };
}
