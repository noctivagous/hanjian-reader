import type { Doc } from '../data/types';

export interface DocRoute {
  docId: string;
  sectionId?: string;
  paragraphId?: string;
  sentenceId?: string;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '') || '/';
}

function stripBase(pathname: string, base: string): string {
  const prefix = trimSlash(base === '/' ? '' : base);
  if (!prefix) return pathname || '/';
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length) || '/';
  return pathname || '/';
}

function joinBase(path: string, base: string): string {
  const rest = path.startsWith('/') ? path : `/${path}`;
  if (!base || base === '/') return rest;
  return `${base.replace(/\/+$/, '')}${rest}`;
}

/** Drop `{docId}-` from nested ids so URLs stay short. */
export function routeSegment(fullId: string, docId: string): string {
  const prefix = `${docId}-`;
  return fullId.startsWith(prefix) ? fullId.slice(prefix.length) : fullId;
}

function matchesId(fullId: string, segment: string, docId: string): boolean {
  return fullId === segment || routeSegment(fullId, docId) === segment;
}

export function parseDocRoute(
  pathname: string,
  base = '/',
): DocRoute | null {
  const path = stripBase(pathname, base).replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean).map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });
  if (parts[0] !== 'doc' || !parts[1]) return null;
  const route: DocRoute = { docId: parts[1] };
  if (parts[2]) route.sectionId = parts[2];
  if (parts[3]) route.paragraphId = parts[3];
  if (parts[4]) route.sentenceId = parts[4];
  return route;
}

export function buildDocPath(route: DocRoute, base = '/'): string {
  const segs = ['doc', route.docId];
  if (route.sectionId) segs.push(routeSegment(route.sectionId, route.docId));
  if (route.paragraphId) segs.push(routeSegment(route.paragraphId, route.docId));
  if (route.sentenceId) segs.push(routeSegment(route.sentenceId, route.docId));
  return joinBase(
    `/${segs.map((s) => encodeURIComponent(s)).join('/')}`,
    base,
  );
}

/** Fill missing section / paragraph / sentence with the first child at that level. */
export function completeDocRoute(doc: Doc, loc: DocRoute): DocRoute {
  const out: DocRoute = { docId: doc.id };
  const section =
    (loc.sectionId
      ? doc.sections.find((s) => matchesId(s.id, loc.sectionId!, doc.id))
      : undefined) ?? doc.sections[0];
  if (!section) return out;
  out.sectionId = section.id;
  const para =
    (loc.paragraphId
      ? section.paragraphs.find((p) => matchesId(p.id, loc.paragraphId!, doc.id))
      : undefined) ?? section.paragraphs[0];
  if (!para) return out;
  out.paragraphId = para.id;
  const sentence =
    (loc.sentenceId
      ? para.sentences.find((s) => matchesId(s.id, loc.sentenceId!, doc.id))
      : undefined) ?? para.sentences[0];
  if (sentence) out.sentenceId = sentence.id;
  return out;
}

/** Map a section / paragraph / sentence id to the full route location. */
export function locateInDoc(doc: Doc, targetId: string): DocRoute {
  const loc: DocRoute = { docId: doc.id };
  for (const section of doc.sections) {
    if (section.id === targetId) {
      loc.sectionId = section.id;
      return completeDocRoute(doc, loc);
    }
    for (const para of section.paragraphs) {
      if (para.id === targetId) {
        loc.sectionId = section.id;
        loc.paragraphId = para.id;
        return completeDocRoute(doc, loc);
      }
      for (const sentence of para.sentences) {
        if (sentence.id === targetId) {
          loc.sectionId = section.id;
          loc.paragraphId = para.id;
          loc.sentenceId = sentence.id;
          return loc;
        }
      }
    }
  }
  return completeDocRoute(doc, loc);
}

export function resolveRouteTarget(doc: Doc, route: DocRoute): string | null {
  if (doc.id !== route.docId) return null;
  const section = route.sectionId
    ? doc.sections.find((s) => matchesId(s.id, route.sectionId!, doc.id))
    : undefined;
  if (!section) return null;
  if (!route.paragraphId) return section.id;
  const para = section.paragraphs.find((p) =>
    matchesId(p.id, route.paragraphId!, doc.id),
  );
  if (!para) return section.id;
  if (!route.sentenceId) return para.id;
  const sentence = para.sentences.find((s) =>
    matchesId(s.id, route.sentenceId!, doc.id),
  );
  return sentence?.id ?? para.id;
}

export function sameRoute(a: DocRoute, b: DocRoute): boolean {
  return buildDocPath(a, '/') === buildDocPath(b, '/');
}
