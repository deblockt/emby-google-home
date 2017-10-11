## Emby for Google home

Emby app to talk with Google home

Curently only support to play movie

### Developpement

To localy start app run command : 

You must have a started postgres database.
You can use docker : 

    docker run --name emby-google-home -e POSTGRES_PASSWORD=mysecretpassword -p 5432:5432 -d postgres

And play script on db-script directory.

You can now run server : 

    tsc && DATABASE_URL=postgres://postgres:mysecretpassword@localhost:5432/postgres node index.js

To test oauth server, you must add client on oauth_clients table.

### Stack

   - api.ai for voice recognition
   - expressjs
   - express-oauth-server
   - ejs template
   - typescript
   - actions-on-google 