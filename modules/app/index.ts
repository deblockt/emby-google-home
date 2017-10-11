import * as express from 'express'
import { ApiClient } from '../google-actions/emby/api-client'
import { DAO } from '../../database'

export const mod = (app: express.Express) => {
    app.get('/signUp', function(req: any, res) {
        req.session.user = undefined
        res.render(__dirname + '/views/signUp.ejs', {error: undefined})
    });

    app.post('/signUp', async function(req: any, res) {
        const username = req.body.username
        const password = req.body.password

        let error = undefined
        try {
            const user = await DAO.saveUser(username, password)
            req.session.user = user.id
        } catch (e) {
            error = e
        }

        if (error) {
            res.render(__dirname + '/views/signUp.ejs', {error})
        } else {
            res.redirect('/config/addServerInfo')
        }
    });

    // Get add server info view.
    app.get('/config/addServerInfo', function(req: any, res) {
        if (!req.session.user)  {
            res.redirect('/login')
            return
        }

        res.render(__dirname + '/views/addServer.ejs', {error: undefined, success: false})
    });

    // Get add server info view.
    app.post('/config/addServerInfo', async function(req: any, res) {
        const uri = req.body.uri
        const user = req.body.user
        const password = req.body.password

        let error = undefined
        try {
            const client = new ApiClient(uri, "google home", "0.0.1", "google home", "xxxxxxx")   
            await client.authenticate(user, password)
        } catch (e) {
            error = e
        }

        DAO.saveServerInfos(uri, user, password, {id: req.session.user})

        
        if (error) {
            res.render(__dirname + '/views/addServer.ejs', {error, success: false})
        } else {
            res.render(__dirname + '/views/addServer.ejs', {error: undefined, success: true})
        }
    });

    app.get('/', function(req, res) {
        res.redirect('/config/addServerInfo')
    });
}