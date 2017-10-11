import * as express from 'express'

import * as ExpressOAuthServer from 'express-oauth-server'
import * as util from 'util'

import { DAO } from '../../database'

export const mod = (app: express.Express) => {

    const oauth = new ExpressOAuthServer({
        model: require('./model')
    });
    
    app.post('/oauth/token', oauth.token());

    // Get authorization.
    app.get('/oauth/authorize', function(req: any, res) {
        req.app.locals.state = req.query.state || req.app.locals.state
    
        // Redirect anonymous users to login page.
        if (!req.session.user) {
            return res.redirect(util.format('/login?redirect=%s&client_id=%s&redirect_uri=%s', req.path, req.query.client_id, req.query.redirect_uri));
        }   
    
        console.log('redirect uri ', req.query.redirect_uri)
        console.log('client id ', req.query.client_id)
    
        res.render(__dirname + '/views/authorize.ejs', {
            client_id: req.query.client_id,
            redirect_uri: req.query.redirect_uri,
            oauth_state: req.app.locals.state
        })
    })

    // Post authorization.
    app.post('/oauth/authorize', function(req: any, res, next) {
        // Redirect anonymous users to login page.
        if (!req.session.user) {
            return res.redirect(util.format('/login?client_id=%s&redirect_uri=%s', req.query.client_id, req.query.redirect_uri));
        }
    
        return oauth.authorize({
            authenticateHandler: {
                handle: function() {
                return Promise.resolve({
                    id: req.session.user
                });
                }
            }
        })(req, res, next);
    });
  
    // Get login.
    app.get('/login', function(req, res) {
        res.render(__dirname + '/views/login.ejs', { 
            redirect: req.query.redirect,
            client_id: req.query.client_id,
            redirect_uri: req.query.redirect_uri
        })
    });

    // Post login.
    app.post('/login', async function(req: any, res) {
        const email = req.body.email
        const password = req.body.password

        const user = await DAO.getUser(email, password)
        
        if (user === undefined) {
            res.render(__dirname + '/views/login.ejs', {
                redirect: req.body.redirect,
                client_id: req.body.client_id,
                redirect_uri: req.body.redirect_uri
            })
            return;
        }
    
        // Successful logins should send the user back to /oauth/authorize.
        var path = req.body.redirect || '/config/addServerInfo' ;
        req.session.user = user.id
        
        const uri = req.protocol + '://' + req.get('host')

        return res.redirect(uri + util.format('%s?client_id=%s&redirect_uri=%s', path, req.body.client_id, req.body.redirect_uri));
    });


    // Get secret.
    app.get('/secret', oauth.authenticate(), function(req, res) {
        // Will require a valid access_token.
        res.send('Secret area');
    });
    
    app.get('/public', function(req, res) {
        // Does not require an access_token.
        res.send('Public area');
    });  
}

