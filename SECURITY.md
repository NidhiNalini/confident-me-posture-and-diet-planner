# Security and privacy

Confident Me has no server, accounts or analytics. Entries are stored only in the
browser's `localStorage`, and **Delete my data** removes them.

Controls in place:

- A Content Security Policy blocks outside scripts and network connections.
- All text is written with `textContent`. A test fails if `innerHTML` is used.
- Numeric input is checked against fixed ranges.
- Saved data is rebuilt through an allow-list when it is loaded.

The page loads its fonts from Google Fonts. That request does not include any
information entered in the app.

To report a problem, please open a GitHub issue. Do not include personal health
information.
