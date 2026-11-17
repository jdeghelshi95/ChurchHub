# Church Hub

Removing the headaches of coordination across teams in one app.

Volunteer scheduling for church teams. This started as a copy of the Medes Media Schedule site and is where the multi-church version is being built and tested. The live Medes site runs from a separate repository and Vercel project, and nothing here affects it.

Plain static pages in `public/` with Node serverless functions in `api/`, hosted on Vercel (project `church-hub`), with data in that project's own Vercel Blob store.

The leader code and session secret are Vercel environment variables and never belong in this repository. `api/_lib/seed.js` holds made-up sample volunteers for testing. Never commit real names, member numbers or children's details here.

Pushing to `main` publishes the test site.
