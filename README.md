# grakken-backend-api

Node.js Express.js.
Axios to make API calls to GitHub for fetching repository content.

Run the server with:
node server.js

or run with Nodemon for development (which automatically restarts the server when files change):
npx nodemon server.js

Once Server is running on port 3000, test on:
http://localhost:3000/api/github/repo?owner=in-c0&repo=GRAKKEN-Github-Repo-Analyser

Check Github API rate limit status at :
https://api.github.com/rate_limit

(Unauthenticated requests can be made 60 times per hour)

