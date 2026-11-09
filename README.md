# PeekSlide

English | [한국어](README.ko.md)

A website for presenting PDF slides with effects such as highlights and flows. Add a PDF and apply the effects you want to each page. Live: https://beaver-shop.cloud

## Features

- View all slides split into sections.
- Add step effects (flows, highlights, and so on) to each slide. Pages can also carry Q&A, links and video.
- Presentation mode, keyboard shortcuts, light and dark themes.
- Log in as admin to edit effects and sections in the browser.
- Optional password per project.

## How it works

Slides are converted from PDF to images. Each project is a folder with a `pages.json`, and a build step turns those into the data the site loads. The front end is plain JavaScript and CSS, built with Vite.

The site is served from S3 behind CloudFront, with a custom domain through Route 53 and ACM. Pushing to `main` runs a GitHub Actions workflow that builds, checks the output, syncs to S3 and invalidates the CloudFront cache. The workflow gets AWS access through an IAM role over OIDC, so no access keys are stored.

Edits made in the browser go to a single AWS Lambda (function URL). It checks the admin password, validates the request, and commits the updated `pages.json` to the repository through the GitHub API. That commit triggers the same deploy workflow, so Git is the only data store and there is no database.

## Usage

Requires Node.js 22 or newer.

    npm install
    npm run dev

Add a new project from a PDF. This converts, commits and pushes, and the deploy then runs on its own.

    bash scripts/add.sh <name> "<path/to/slides.pdf>"

Change a project's title.

    bash scripts/title.sh <name> "<new title>"

Shortcuts: Left/Right or Space to move, P to present, Q for Q&A, T for theme, Esc to exit.
