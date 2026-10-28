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
