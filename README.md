# PeekSlide

English | [한국어](README.ko.md)

A static site for browsing slide decks exported from Figma or PDF, and presenting them with click-by-click highlights. Live: https://beaver-shop.cloud

## Features

- Browse every slide as a grid, or by section.
- Step through a slide with boxes and lines highlighted on each click. Pages can also carry Q&A notes, links and video.
- Presentation mode, keyboard shortcuts, light and dark themes.
- After logging in as admin, edit highlights and sections in the browser.
- Optional password per project.

## How it works

Slides are converted from PDF to images locally. Each project is a folder with a `pages.json`, and a build step turns those into the data the site loads. The front end is plain JavaScript and CSS, built with Vite.

The site is served from S3 behind CloudFront, with a custom domain through Route 53 and ACM. Pushing to `main` runs a GitHub Actions workflow that builds, checks the output, syncs to S3 and invalidates the CloudFront cache. The workflow gets AWS access through an IAM role over OIDC, so no access keys are stored.

Edits made in the browser go to a single AWS Lambda (function URL). It checks the admin password, validates the request, and commits the updated `pages.json` to the repository through the GitHub API. That commit triggers the same deploy workflow, so Git is the only data store and there is no database.

## Usage

Requires Node.js 22 or newer.

    npm install
    npm run dev

Add a project from a PDF. This converts, commits and pushes, and the deploy runs on its own:

    bash scripts/add.sh <name> "<path/to/slides.pdf>"

Change a project's title:

    bash scripts/title.sh <name> "<new title>"

Shortcuts: Left/Right or Space to move, P to present, Q for notes, T for theme, Esc to exit.

## Limitations

Project passwords are checked in the browser (SHA-256). They keep casual visitors out but are not real access control, and anyone who knows an image URL can open it directly.
