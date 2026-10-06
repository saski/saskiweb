# saskiweb

## Public pages

- `/` — generative audiovisual home page
- `/cv/` — responsive, print-friendly professional CV
- `/notes/` — an editorial index of writing on people, software and learning in public
- `/notes/feed.xml` — full-text RSS feed

The CV page offers a direct PDF download in addition to printing. The reviewed
October 5, 2026 PDF is stored alongside the page as
`Nacho_Viejo_Engineering_Manager_CV_2026-10-05.pdf`. The two-page revision makes AI
leadership explicit across individual practice, team adoption and company
governance, while retaining the Engineering Manager positioning and approved
professional portrait. The page and its structured identity metadata use the
same scope and attribution.

The previous October 2 PDF and existing September 21 compatibility URL retain
their earlier approved binary; they are historical, not the current download.
The page links only to the October 5 version, avoiding stale cached downloads.
Run `node --test`
before publishing; the CV tests verify the download target and the reviewed file's
SHA-256 hash. Replace the PDF and its test reference together when a new revision
is approved.

The canonical portrait approved on October 2, 2026 is published as
`cv/nacho-viejo-2026-10-02.png`; `cv/nacho-viejo.png` also contains the same image.
The website displays `cv/nacho-viejo-2026-10-02-bw.png`, a wider monochrome
derivative with more headroom and soft photographic contrast. The circular frame
remains 210 px on desktop and 112 px on mobile. The downloadable CV uses the
approved color source.

## Notes

Notes brings selected original LinkedIn writing home to saski.com. Entries keep their original publication date and language, with a permanent URL, related reading and a link to the original conversation. The index can be filtered by topic; every note is readable without JavaScript or a LinkedIn account.

For authoring, local preview, checks and publishing, see [DEVELOPMENT.md](DEVELOPMENT.md).
