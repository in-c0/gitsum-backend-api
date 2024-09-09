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


Express is no longer being used ; Vercel serverless functions are used instead. 
Run with :
    vercel dev
or
    vercel dev --debug

Clear cache and Redeploy:
    vercel --prod --force

// Once Server is running on port 3000, you can test with:
// http://localhost:3000/api/github/repo?owner=in-c0&repo=GRAKKEN-Github-Repo-Analyser


Configure vercel.json for Serverless Functions:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

Explanation:
*version: 2: Specifies the version of the Vercel configuration format.
*builds: Tells Vercel to use the @vercel/node builder for any .js files inside the api/ folder. This allows Vercel to treat them as serverless functions.
*routes: Defines how routes are handled. All incoming requests (/(.*)) are routed to the /api/ directory (/api/$1), which allows all your serverless function routes to work.


```
/api/
  ├── index.js    // Handles requests to "/"
  └── test.js     // Handles requests to "/api/test"
package.json
vercel.json
```




10/09/2024: Trying to get streaming data passed to the client but it's somehow not working.
