import { ApiAiApp } from 'actions-on-google-ts'

import * as express from 'express'
import * as Fuse from 'fuse.js'

import { ApiClient, Movie, Session } from './emby/api-client'
import { TranslationFactory, Translation } from './translations/translation'

import { DAO } from '../../database'

const FUSE_OPTION = {
    shouldSort: true,
    tokenize: true,
    includeScore: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 2,
    keys: [
      "DeviceName"
    ]
};

/**
 * the use want to play a movie
 * Search for movie and set context
 * 
 * @param {ApiAiApp} app ApiAiApp instance
 * @return {void}
 */
const playMovie = async (app: ApiAiApp, client: ApiClient, translation: Translation): Promise<any> => {
    console.log("on playMovie")
    let movieName = app.getArgument("movie") as any
    const device = app.getArgument("device") as any
    const location = app.getArgument("location") as any

    if (Array.isArray(movieName)) {
        movieName = movieName[0]
    }

    const movies = await client.searchMovie(movieName)

    console.log('play movie', movieName, device, location)

    if (device != "" && device != null) {
        console.log("add device context")
        app.setContext('device', 10, {device})
    }
    if (location != "" && location != null) {
        console.log("add device location")
        app.setContext('location', 10, {location})
    }

    if (movies.length == 1) {
        app.setContext('movie', 5, {movie: movies[0]})
        app.setContext('movie-list', 0)
        
        await lookForDevice(client, translation, app, movies[0], device, location)
    } else if (movies.length == 0) {
        app.setContext('movie', 0)
        app.setContext('device', 0)
        app.setContext('location', 0)

        app.ask(translation.get('movieNotFound', [movieName]))
    } else {
        app.setContext('movie-list', 5, {movieList: movies})
        app.setContext('movie', 0)
        
        const options = movies
                            .sort((a, b) => a.ProductionYear - b.ProductionYear)
                            .map(movie => app.buildOptionItem(movie.ItemId, []).setTitle(movie.Name));
        
        app.askWithList(translation.get('multipleMovieFound'),
            app.buildList(translation.get('movieList')).addItems(options)
        )
    }
}

const lookForDevice = async (client: ApiClient, translation: Translation, app: ApiAiApp, movie: Movie, deviceName: string, locationName: string) => {
    if ((!deviceName || deviceName.trim() == "") && (!locationName || locationName.trim() == "")) {
        app.ask(translation.get('whichDevicePlayMovie', [movie.Name]))
    } else {
        const controllableDevices = await client.getControllableSessions()
        let filter = locationName != null ? locationName : deviceName
    
        console.log('controllable devices',  controllableDevices)
        console.log('on lookForDevice ', deviceName, deviceName == undefined, locationName)
        console.log('looking for device ', filter)

        const fuse = new Fuse(controllableDevices, FUSE_OPTION)
        const result: any[] = fuse.search(filter)
    
        console.log("per founded device", result)
        // if multiple result keep result with sensible same score
        const filteredDevices = result.filter(
            (item, index, array) => array[index+1] === undefined || array[index+1].score - item.score > 0.2
        ).map(result => result.item)
    
        console.log("filtredDevice", filteredDevices)
        if (filteredDevices.length == 0) {
            if (controllableDevices.length == 0) {
                console.log("No device found")
                app.tell(translation.get('noDeviceAvailable'))
            } else {
                console.log("multiple device found. send list")
                app.setContext('device-list', 5, {deviceList: controllableDevices})
                askForDeviceWithList(app, translation, filter, controllableDevices)
            }
        } else if (filteredDevices.length > 1) {
            app.setContext('device-list', 5, {deviceList: filteredDevices})
            askForDeviceWithList(app, translation, filter, filteredDevices)
        } else {
            const device = filteredDevices[0]
            playMovieOnDevice(app, movie, device, client, translation)
        }
    }
}

const askForDeviceWithList = (app: ApiAiApp, translation: Translation, filter: string, deviceList: Session[]) => {
    if ("actions.capability.SCREEN_OUTPUT" in app.getSurfaceCapabilities()) {
        const buildDeviceOption = (device) => app.buildOptionItem(device.DeviceId, []).setTitle(device.DeviceName)
        const options = deviceList.map(buildDeviceOption)
        app.askWithList(translation.get('tooManyDevices', [filter]),
            app.buildList(translation.get('deviceList')).addItems(options)
        )
    } else {
        const sentence = translation.get('tooManyDevices', [filter])
        if (deviceList.length < 5) {
            const deviceListString = deviceList.map((device) => device.DeviceName).join(".\n")
            app.ask(sentence + "." + deviceListString)
        } else {
            app.ask(sentence)
        }
    }
}

/**
 * hack to check option list selection
 * 
 * @param {ApiAiApp} app ApiAiApp instance
 * @return {void}
 */
const defaultFallback = async (app: ApiAiApp, client: ApiClient, translation: Translation) => {
    const movieListContext = app.getContext("movie-list") as any
    const deviceListContext = app.getContext("device-list") as any

    const actionIntentOptionSelected = app.getArgument('OPTION')
    
    console.log('on default fallback')
    console.log('is selected option present ?', actionIntentOptionSelected != undefined)
    console.log('have a movie list', movieListContext != undefined)

    if (actionIntentOptionSelected) {
        if (movieListContext) {
            const movieId = actionIntentOptionSelected.toString()
            const movieList: Movie[] = movieListContext.parameters.movieList as Movie[]
            const movie = movieList.filter(item => item.ItemId == movieId)[0]

            app.setContext('movie-list', 0)
            app.setContext('movie', 5, {movie: movie})
            app.setContext('actions_intent_option', 0)

            const deviceContext = app.getContext('device') as any
            const deviceName = deviceContext ? deviceContext.parameters.device : ""
            const locationContext = app.getContext('location') as any
            const locationName = locationContext ? locationContext.parameters.location : ""
            console.log("device context ", deviceContext, "location context", locationContext)
            console.log(`Device ${deviceName}, location ${locationName}`)
            await lookForDevice(client, translation, app, movie, deviceName, locationName)
        } else if (deviceListContext) {
            const deviceId = actionIntentOptionSelected.toString()
            const devices = deviceListContext.parameters.deviceList as Session[]
            const device = devices.filter(item => item.DeviceId == deviceId)[0]
            const movie: Movie = (app.getContext('movie') as any).parameters.movie

            playMovieOnDevice(app, movie, device, client, translation)

            app.setContext('device-list', 0)
            app.setContext('actions_intent_option', 0)
        } else {
            app.ask(translation.get('error'))
        }
    } else {
        // TODO add radom response on error
        app.ask(translation.get('notUnderstand'))
    }
}

const playOnDevice = async (app: ApiAiApp, client: ApiClient, translation: Translation) => {
    const device = app.getArgument('device') as any
    const location = app.getArgument('location') as any
    const movie: Movie = (app.getContext('movie') as any).parameters.movie
    
    await lookForDevice(client, translation, app, movie, device, location)
}

const playMovieOnDevice = (app: ApiAiApp, movie: Movie, device: Session, client: ApiClient, translation: Translation) => {
    client.playItem(movie, device)
    app.tell(translation.get('playingMoovie', [movie.Name, device.DeviceName]))
    app.setContext('device', 5, device)
}

/**
 * create a action who can access to emby client
 * 
 * @param funct the function to call
 */
const useApiClient = (funct : (ApiAiApp, ApiClient, Translation) => Promise<any>) => {
    return async (app: ApiAiApp) => {
        const googleUser = app.getUser()
        const token = googleUser ? googleUser.accessToken : undefined
        
        if (token) {
            try {
                const translation = await TranslationFactory.create(app.getUserLocale())
                const serverInfo = await DAO.getServerInfosFromToken(token)
                if (serverInfo) {
                    const client = new ApiClient(serverInfo.uri, "google home", "0.0.1", "google home", "xxxxxxx")   
                    await client.authenticate(serverInfo.emby_user, serverInfo.emby_user_password)
                                        
                    await funct(app, client, translation)
                } else {
                    app.tell(translation.get("no_server_infos"))
                }
            } catch (e) {
                console.error("UN ERREUR EST SURVENUE ", e)
                const translation = await TranslationFactory.create(app.getUserLocale())
                app.tell(translation.get("unable_to_contact"))
            }
        } else {
            console.log("ASK FOR SIGNIN")
            app.askForSignIn()
        }
    }
}

const actionMap = new Map();
actionMap.set('play-movie', useApiClient(playMovie))
actionMap.set('play-on-device', useApiClient(playOnDevice))
actionMap.set('input.unknown', useApiClient(defaultFallback))

export const mod = (app: express.Express) => {
    app.post('/google-actions', async function (request, response) {
        const app = new ApiAiApp({ request, response });
    
        console.log(`Request headers: ${JSON.stringify(request.headers)}`);
        console.log(`Request body: ${JSON.stringify(request.body)}`);
        console.log(`Request Intent: ${app.getIntent()}`)
        app.handleRequest(actionMap);
    })
}