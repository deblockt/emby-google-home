import { DAO } from '../../database'

/*
 * Get access token.
 */

module.exports.getAccessToken = function(bearerToken) {
  return DAO.getAccessToken(bearerToken)
    .then(function(result) {
      var token = result[0];

      return {
        accessToken: token.access_token,
        client: {id: token.client_id},
        expires: token.expires,
        user: {id: token.userId}, // could be any object
      };
    });
}

/**
 * Get client.
 */

module.exports.getClient = function(clientId, clientSecret) {
  return DAO.getClient(clientId)
    .then(function(result) {
      var oAuthClient = result[0];

      if (!oAuthClient || (clientSecret && clientSecret !== oAuthClient.client_secret)) {
        return;
      }

      return {
        id: oAuthClient.client_id,
        clientSecret: oAuthClient.client_secret,
        grants: ['authorization_code', 'refresh_token'], // the list of OAuth2 grant types that should be allowed
        redirectUris: [oAuthClient.redirect_uri]
      };
    });
}

/**
 * Get refresh token.
 */

module.exports.getRefreshToken = function(bearerToken) {
  return DAO.getRefreshToken(bearerToken)
     .then(function(result) {
      var resultData = result[0]
      return result ? {
        refreshToken: resultData.refresh_token,
        refreshTokenExpiresAt: resultData.refresh_token_expires_on,
        client: {id: resultData.client_id},
        user: {id: resultData.user_id}
      } : false;
    });
}

/*
 * Get user.
 */

module.exports.getUser = function(username, password) {
  return DAO.getUser(username, password)
    .then(function(user) {
      return user;
    });
}

/**
 * Save token.
 */

module.exports.saveToken = function(token, client, user) {
  return DAO.saveToken(token, client, user)
    .then(function() {
      return {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        client: client,
        user: user
      }
    });
}

module.exports.revokeToken = function (token) {
  return DAO.revokeToken(token)
  .then(function() {
    return true
  });
}

module.exports.saveAuthorizationCode = function(code, client, user) {
  return DAO.saveAuthorizationCode(code, client, user)
  .then(function() {
    return {
      authorizationCode: code.authorizationCode, 
      expiresAt: code.expiresAt, 
      redirectUri: code.redirectUri , 
      client: client,
      user: user
    }
  });
}

module.exports.getAuthorizationCode = function(authorizationCode) {
  return DAO.getAuthorizationCode(authorizationCode)
  .then(function(result) {
    var resultData = result[0]
    return result ? {
      authorizationCode: authorizationCode, 
      expiresAt: resultData.expires_at, 
      redirectUri: resultData.redirectUri , 
      client: {id: resultData.client_id},
      user: {id: resultData.user_id}
    } : false;
  });
}

module.exports.revokeAuthorizationCode = function(authorizationCode) {
  return DAO.revokeAuthorizationCode(authorizationCode)
  .then(function() {
    return true
  });
}
