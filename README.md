# portfolio

Source of [mahfouz98.github.io/portfolio](https://mahfouz98.github.io/portfolio/), the portfolio of Ahmed Mahfouz, DevOps engineer.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies, no trackers.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | All content. Edit text here. |
| `assets/css/site.css` | Styles. Design tokens are at the top of the file. |
| `assets/js/site.js` | Enhancements: live pipeline panel, console, note filters, contact form. The page is complete without it. |
| `assets/fonts/` | Self-hosted Archivo and JetBrains Mono (SIL OFL). |
| `resume/resume.html` | Source of `resume.pdf`. See "Updating the résumé" below. |
| `404.html` | Not-found page served by GitHub Pages. |
| `scripts/check-links.mjs` | Checks every local link, asset and anchor. |
| `.github/workflows/ci.yml` | The pipeline described below. |

## Pipeline

Every push and pull request runs two jobs:

- **validate**: `html-validate` on the HTML, then `scripts/check-links.mjs`.
- **lighthouse**: Lighthouse CI against the budgets in `.lighthouserc.json` (accessibility and SEO must score 95 or higher and best practices 90 or higher; performance below 90 is a warning).

The panel in the site's hero reads the result of these jobs for the latest commit from the GitHub API, so the status it shows is the real one.

### Deploying

By default GitHub Pages publishes the `main` branch directly, and the jobs above only report.

To make the checks gate the deploy, so a failing check never reaches production:

1. Settings > Pages > Build and deployment > Source: **GitHub Actions**
2. Settings > Secrets and variables > Actions > Variables: add `DEPLOY_WITH_ACTIONS` = `true`

The `deploy` job in `ci.yml` then publishes only after `validate` and `lighthouse` pass.

## Run it locally

```sh
python3 -m http.server 4173
# open http://localhost:4173
```

Run the same checks as CI:

```sh
npx html-validate@11.21.0 index.html 404.html resume/resume.html
node scripts/check-links.mjs
npx @lhci/cli@0.16.0 collect && npx @lhci/cli@0.16.0 assert
```

## Updating the résumé

Edit `resume/resume.html`, then rebuild the PDF from the repo root:

```sh
google-chrome --headless --no-pdf-header-footer --print-to-pdf=resume.pdf resume/resume.html
```

## Editing notes

- **Console commands** read their output from the page itself (`kubectl get skills` lists the rows of the stack section, and so on), so editing `index.html` updates both.
- **Production work**: each `<article class="sys">` has a `data-name` used by `kubectl describe deployment <name>` and an inline SVG diagram. Diagram styles live under `/* diagrams */` in the CSS.
- **Content Security Policy**: the `<meta http-equiv="Content-Security-Policy">` tag in `index.html` only allows this site's own files, the GitHub API and Formspree. A new third-party script, font or embed must be allowed there or the browser will block it.
- If the site moves to another URL, update the canonical and Open Graph URLs in `index.html`, plus `robots.txt`, `sitemap.xml`, `404.html` and the `REPO` constant in `site.js`.
