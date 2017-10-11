import * as CryptoJS  from 'crypto-js'

import * as request from 'request-promise'

export class ApiClient {
    private accessToken: string = ""
    private userId: string = ""

    constructor(
        private serverAddress: String,
        private appName: String,
        private appVersion: String,
        private deviceName: String,
        private deviceId: String
    ) {
        this.serverAddress = this.serverAddress.toLowerCase();
        if (this.serverAddress.indexOf('/emby') === -1 && this.serverAddress.indexOf('/mediabrowser') === -1) {
            this.serverAddress += '/emby';
        }
        if (this.serverAddress.charAt(0) !== '/') {
            this.serverAddress += '/';
        }
    }

    private get headers() {
        let headerInfos = {
            Client: this.appName,
            Version: this.appVersion,
            Device: this.deviceName,
            DeviceId: this.deviceId,
            Token:  this.accessToken
        }
        let headerString = "MediaBrowser"
        for (const key of Object.keys(headerInfos)) {
            headerString += " ," + key + "=\"" + headerInfos[key] + "\""
        }

        return {
            'X-Emby-Authorization': headerString
        }
    }

    async authenticate(username: string, password: string = "") {
        const options = {
            uri: this.serverAddress + 'Users/authenticatebyname',
            method: 'POST',
            json: true,
            body: {
                Username: username,
                Password: CryptoJS.SHA1(password).toString(),
                PasswordMd5: CryptoJS.MD5(password).toString()
            },
            headers: this.headers
        }

        var response = await request(options)
        this.accessToken = response.AccessToken
        this.userId = response.User.Id
        console.log('Successfully connected. Access token ', this.accessToken)
    }

    async searchMovie(movieName: string): Promise<Movie[]> {
        const options = {
            uri: this.serverAddress + 'Search/Hints',
            qs: {
                searchTerm: movieName,
                limit: 10,
                usreId: this.userId,
                includeArtists: false,
                includeGenres: false,
                includeMedia: false,
                includePeople: false,
                includeStudios: false
            },
            method: 'GET',
            json: true,
            headers: this.headers
        }

        try {
            var response = await request(options)
            
            var movies = response.SearchHints.filter(item => item.Type == 'Movie')
        
            return movies
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async getControllableSessions(): Promise<Session[]> {
        
        const options = {
            uri: this.serverAddress + 'Sessions',
            qs: {
                ControllableByUserId: this.userId,
            },
            method: 'GET',
            json: true,
            headers: this.headers
        }

        try {
            var response = await request(options)
            return response
        } catch (e) {
            console.error(e)
            return []
        }
    }

    async playItem(movie: Movie, session: Session) {
        const options = {
            uri: this.serverAddress + 'Sessions/' + session.Id + '/Playing',
            qs: {
                ItemIds: movie.ItemId,
                PlayCommand: "PlayNow"
            },
            method: 'POST',
            json: true,
            headers: this.headers
        }
        try {
            var response = await request(options)
            return response
        } catch (e) {
            console.error(e)
        }
    }
}

export interface Movie {
    ItemId: string,
    Name: string,
    ProductionYear: number,
    PrimaryImageTag: string,
    ThumbImageTag: string,
    ThumbImageItemId: string,
    BackdropImageTag: string,
    BackdropImageItemId: string
}

export interface Session {
    DeviceId: string
    DeviceName: string
    Id: string
}