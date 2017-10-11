import * as express from "express"
import * as expressSession from "express-session"

import * as bodyParser from "body-parser"

import * as googleActionModule from './modules/google-actions'
import * as oauthModule from './modules/oauth'
import * as appModule from './modules/app'

import * as i18n from 'i18n'

const app = express()
app.set('port', (process.env.PORT || 5000));

// Add body parser.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressSession({
    secret: 'EMBY SECRET SESSION KEY',
    resave: false,
    saveUninitialized: false
}));

i18n.configure({
    directory: __dirname + '/locales'
});
app.use(i18n.init)
// register helper as a locals function wrapped as mustache expects
app.use((req: any, res, next) => {
    // mustache helper
    res.locals.__ = (text, render) => {
        return i18n.__.apply(req, [text, render]);
    };
    next();
});

const modules = [
    googleActionModule.mod,
    oauthModule.mod,
    appModule.mod
]

modules.forEach(mod => mod(app))

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
