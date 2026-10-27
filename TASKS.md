[ ] A real segmenter.  Chinese word segmentation is now heuristic. Greedy longest-match over the existing WordAlign set can mis-split a character
    sequence that isn't in the alignment table; the per-character fallback bounds the damage, but hover granularity in
    Chinese-primary mode will occasionally be one character where a two-character word exists.


- app might take data and actively convert it to .epub
along with one of the formats designed specifically 
for storing original text alongside its translations.
