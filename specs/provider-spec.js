'use strict';

const nock = require('nock');
const { expect } = require('chai');
const { Provider } = require('../lib');
const { Profile } = require('../lib');
const { config } = require('../lib');

describe('Provider', () => {
  describe('Signin', () => {
    it('should return facebook signin url', () => {
      const provider = 'facebook';
      const providerConfig = config({ provider });
      const options = { signin_uri: `https://auth.laardee.com/signin/${provider}`, scope: 'email', state: 'state-123' };
      return (new Provider(providerConfig)).signin(options)
        .then(data =>
          expect(data.url).to.equal('https://auth.laardee.com/signin/facebook?client_id=fb-mock-id&redirect_uri=https://test-api-id.execute-api.eu-west-1.amazonaws.com/prod/authentication/callback/facebook&scope=email&state=state-123'));
    });

    it('should return custom signin url', () => {
      const provider = 'custom-config';
      const providerConfig = config({ provider });
      const options = { signin_uri: `https://auth.laardee.com/signin/${provider}`, scope: 'email', state: 'state-123' };
      return (new Provider(providerConfig)).signin(options)
        .then((data) => {
          expect(data.url).to.equal('https://auth.laardee.com/signin/custom-config?client_id=cc-mock-id&redirect_uri=https://test-api-id.execute-api.eu-west-1.amazonaws.com/prod/authentication/callback/custom-config&scope=email&state=state-123');
        });
    });

    it('should fail to return signin url', () => {
      const provider = 'crappyauth';
      const providerConfig = config({ provider });
      const options = { authorization_url: 'https://auth.laardee.com/signin/', scope: 'email', state: 'state-123' };
      return (new Provider(providerConfig)).signin(options)
        .catch((error) => {
          expect(error).not.to.be.null();
        });
    });
  });

  describe('Callback', () => {
    before(() => {
      nock('https://auth.laardee.com')
        .post('/auth')
        .reply(200, {
          access_token: 'access-token-123'
        });

      nock('https://api.laardee.com')
        .get('/me')
        .query({ access_token: 'access-token-123' })
        .reply(200, {
          id: '1',
          name: 'Eetu Tuomala',
          email: {
            primary: 'email@test.com'
          },
          profileImage: 'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460'
        });
    });

    it('should return profile', () => {
      const expectedProfile = {
        id: '1',
        name: 'Eetu Tuomala',
        email: 'email@test.com',
        picture: 'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460',
        provider: 'facebook',
        _raw: {
          id: '1',
          name: 'Eetu Tuomala',
          email: { primary: 'email@test.com' },
          profileImage: 'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460',
          provider: 'facebook'
        }
      };

      const provider = 'facebook';
      const providerConfig = config({ provider });

      const profileMap = response =>
        new Profile(Object.assign(response, {
          email: response.email ? response.email.primary : null,
          picture: response.profileImage
        }));

      const options = {
        authorization_uri: 'https://auth.laardee.com/auth',
        profile_uri: 'https://api.laardee.com/me',
        profileMap
      };

      const additionalParams = {
        grant_type: 'authorization_code'
      };

      return (new Provider(providerConfig)).callback(
        {
          code: 'abcde',
          state: 'state-123'
        },
        options,
        additionalParams
      )
        .then((profile) => {
          expect(profile.id).to.equal(expectedProfile.id);
          expect(profile.name).to.equal(expectedProfile.name);
          expect(profile.email).to.equal(expectedProfile.email);
          expect(profile.picture).to.equal(expectedProfile.picture);
          expect(profile.provider).to.equal(expectedProfile.provider);
          return expect(profile.at_hash).to.equal('access-token-123');
        });
    });
  });
});
