export type DrawerPlacement = 'right' | 'left' | 'bottom';

const DRAWER_WIDTH = 248;
const DRAWER_GAP = 8;

/** Pick the drawer side with room: right preferred, then left, else bottom. */
export function chooseDrawerPlacement(
  cardLeft: number,
  cardRight: number,
  viewportWidth: number,
): DrawerPlacement {
  if (viewportWidth - cardRight - DRAWER_GAP >= DRAWER_WIDTH) return 'right';
  if (cardLeft - DRAWER_GAP >= DRAWER_WIDTH) return 'left';
  return 'bottom';
}

const POP_GAP = 8;
const VIEW_MARGIN = 8;

/** Word-card popover: prefer below unless that covers `avoidBelowY` (expanded chip). */
export function choosePopoverVerticalPlacement(
  anchor: Pick<DOMRect, 'top' | 'bottom'>,
  cardHeight: number,
  viewportHeight: number,
  avoidBelowY?: number,
): 'above' | 'below' {
  const belowTop = anchor.bottom + POP_GAP;
  const belowBottom = belowTop + cardHeight;
  const aboveBottom = anchor.top - POP_GAP;
  const aboveTop = aboveBottom - cardHeight;

  const belowFits = belowBottom <= viewportHeight - VIEW_MARGIN;
  const aboveFits = aboveTop >= VIEW_MARGIN;

  const coversChip = avoidBelowY != null && belowBottom > avoidBelowY + 4;

  if (coversChip && aboveFits) return 'above';
  if (belowFits) return 'below';
  if (aboveFits) return 'above';
  return 'below';
}

export function popoverCoords(
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left'>,
  cardWidth: number,
  cardHeight: number,
  vertical: 'above' | 'below',
  viewportWidth: number,
): { top: number; left: number } {
  const top =
    vertical === 'above'
      ? anchor.top - POP_GAP - cardHeight
      : anchor.bottom + POP_GAP;
  const left = Math.min(
    viewportWidth - cardWidth - VIEW_MARGIN,
    Math.max(VIEW_MARGIN, anchor.left),
  );
  return { top, left };
}
