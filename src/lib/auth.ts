/**
 * @since 0.0.1
 * @file An oAuth2.0 client
 * @module auth
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as axios from "axios"

/**
 * @since 0.0.1
 * @class Auth
 * @classdesc Authenticate using oAuth2.0
 */
export default class Auth {
	/**
	 * The access token
	 * @private
	 */
	private _accessToken: string
	/**
	 * Base64 encoded string with authentication credentials
	 * @private
	 */
	private _base64AuthString: string
	/**
	 * Time and date of when the access token expires
	 * @private
	 */
	private _accessTokenExpiresAt: Date

	/**
	 * @since 0.0.1
	 * @param {string} accessTokenUrl - URL to POST to get an access token
	 * @param {string} _consumerKey - Consumer key to use to get access token
	 * @param {string} _consumerSecret - Consumer secret to use to get access token
	 */
	constructor(public accessTokenUrl: string, private _consumerKey: string, private _consumerSecret: string) {
		this._base64AuthString = Buffer.from(`${this._consumerKey}:${this._consumerSecret}`).toString("base64")
		this._accessTokenExpiresAt = new Date(0)
	}

	/**
	 * Get an access token
	 * @since 0.0.1
	 * @method getAccessToken
	 * @returns {Promise<string>}
	 * @public
	 */
	public getAccessToken(): Promise<string> {
		return new Promise((resolve, reject) => {
			if (this.accessTokenIsValid) {
				resolve(this.accessToken)
			}

			return axios.default.request({
				method: "POST",
				url: this.accessTokenUrl,
				responseType: "json",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${this._base64AuthString}`,
				},
				params: {
					grant_type: "client_credentials"
				}
			}).then(({ data }) => {
				this._accessToken = data.access_token
				this._accessTokenExpiresAt = new Date(Date.now() + (parseInt(data.expires_in) * 1000))

				return resolve(this.accessToken)
			}).catch((error) => {
				return reject(error)
			})
		});
	}

	/**
	 * The access token
	 */
	get accessToken(): string {
		return this._accessToken
	}

	/**
	 * Whether the access token is valid or not
	 */
	get accessTokenIsValid(): boolean {
		if (!this.accessTokenExpiresAt && this.accessTokenExpiresAt < Date.now()) {
			return false
		} else {
			return true
		}
	}

	/**
	 * The time and date for when the access token expires in milliseconds
	 */
	get accessTokenExpiresAt(): number {
		return this._accessTokenExpiresAt.getTime()
	}
}
