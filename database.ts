import * as pgPromise from 'pg-promise'
import * as CryptoJS from 'crypto-js'

export class DAO {
    private static AES_SALT_BASE_URI = process.env.AES_SALT_BASE_URI || 'salt_base_uid_emby'
    private static AES_SALT_EMBY_PASSWORD = process.env.AES_SALT_EMBY_PASSWORD || 'salt_emby_password'

    private static pg = pgPromise()(process.env.DATABASE_URL as string)

    static getAccessToken(bearerToken) {
        return this.pg.query('SELECT access_token, access_token_expires_on, client_id, refresh_token, refresh_token_expires_on, user_id FROM oauth_tokens WHERE access_token = $1', [bearerToken])
    }
 
    static getClient(clientId) {
        return this.pg.query('SELECT client_id, client_secret, redirect_uri FROM oauth_clients where client_id=$1', [clientId])
    }

    static getRefreshToken(bearerToken) {
        return this.pg.query('SELECT access_token, access_token_expires_on, client_id, refresh_token, refresh_token_expires_on, user_id FROM oauth_tokens WHERE refresh_token = $1', [bearerToken])
    }

    static getUser(username, password): Promise<{id: string}> {
        return this.pg.query('SELECT id FROM users WHERE username = $1 AND password = crypt($2, password)', [username, password])
            .then(function(result) {
                return result[0];
            });
    }

    static saveUser(username, password): Promise<{id: string}> {
        return this.pg.query(`insert into users(id, username, password) values (uuid_generate_v4(), $1, crypt($2, gen_salt('md5')))`, [username, password])
            .then(async function() {
                return await DAO.getUser(username, password)
            });
    }

    static saveToken(token, client, user) {
        return this.pg.query('INSERT INTO oauth_tokens(id, access_token, access_token_expires_on, client_id, refresh_token, refresh_token_expires_on, user_id) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)', [
          token.accessToken,
          token.accessTokenExpiresAt,
          client.id,
          token.refreshToken,
          token.refreshTokenExpiresAt,
          user.id
        ])
    }

    static revokeToken(token) {
        return this.pg.query('delete from oauth_tokens where refresh_token = $1', [
            token.refreshToken
        ])
    }

    static saveAuthorizationCode(code, client, user) {
        return this.pg.query('INSERT INTO authorization_codes(id, authorization_code, expires_at, redirectUri, client_id, user_id) VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)', [
          code.authorizationCode,
          code.expiresAt,
          code.redirectUri,
          client.id,
          user.id
        ])
    }

    static getAuthorizationCode(authorizationCode) {
        return this.pg.query('SELECT expires_at, redirectUri, client_id, user_id FROM authorization_codes WHERE authorization_code = $1', [authorizationCode])
    }      

    static revokeAuthorizationCode(authorizationCode) {
        return this.pg.query('delete from authorization_codes where authorization_code = $1', [
          authorizationCode
        ])
    }

    static getServerInfosFromToken(token: string) {
        return this.pg.query('select uri, emby_user, emby_user_password from server_info join oauth_tokens on oauth_tokens.user_id = server_info.user_id where access_token = $1', [
            token
        ]).then((results) => {
            const result = results[0]
            if (result) {
                const decryptedURI = JSON.parse(CryptoJS.AES.decrypt(result.uri, DAO.AES_SALT_BASE_URI).toString(CryptoJS.enc.Utf8))
                const decryptedPassword = JSON.parse(CryptoJS.AES.decrypt(result.emby_user_password, DAO.AES_SALT_EMBY_PASSWORD).toString(CryptoJS.enc.Utf8))

                return {
                    uri: decryptedURI,
                    emby_user: result.emby_user,
                    emby_user_password: decryptedPassword,
                }
            } else {
                return undefined;
            }
        });
    }

    static saveServerInfos(base_uri: string, emby_user: string, emby_user_password: string, user: {id: string}) {
        const encrypted_base_uri = CryptoJS.AES.encrypt(JSON.stringify(base_uri), DAO.AES_SALT_BASE_URI).toString();
        const encrypted_password = CryptoJS.AES.encrypt(JSON.stringify(emby_user_password), DAO.AES_SALT_EMBY_PASSWORD).toString();

        const query = `
            INSERT INTO server_info(uri, emby_user, emby_user_password, user_id) VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id) DO UPDATE
                    set uri = $1, emby_user = $2, emby_user_password = $3
        `

        return this.pg.query(query, [
            encrypted_base_uri,
            emby_user,
            encrypted_password,
            user.id
        ]);
    }

    static getServerInfos(user: {id: string}) {
        return this.pg.query('select uri, emby_user, emby_user_password from server_info where user_id = $1', [
            user.id
        ]).then((results) => {
            const result = results[0]

            const decryptedURI = JSON.parse(CryptoJS.AES.decrypt(result.uri, DAO.AES_SALT_BASE_URI).toString(CryptoJS.enc.Utf8))
            const decryptedPassword = JSON.parse(CryptoJS.AES.decrypt(result.emby_user_password, DAO.AES_SALT_EMBY_PASSWORD).toString(CryptoJS.enc.Utf8))

            return {
                uri: decryptedURI,
                emby_user: result.emby_user,
                emby_user_password: decryptedPassword,
            }
        });
    }
}