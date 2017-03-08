import * as request from "request-promise-native"

export default class Auth {
	private _accessToken: string
	private _base64AuthString: string
	private _accessTokenExpiresAt: Date

	constructor(public accessTokenUrl: string, private _consumerKey: string, private _consumerSecret: string) {
		this._base64AuthString = new Buffer(`${this._consumerKey}:${this._consumerSecret}`).toString("base64")
	}

	public getAccessToken(): Promise<string> {
		return new Promise((resolve, reject) => {
			return request({
				url: this.accessTokenUrl,
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"Authorization": `Basic ${this._base64AuthString}`
				},
				form: {
					"grant_type": "client_credentials"
				}
			}).then((body) => {
				const data = JSON.parse(body)

				this._accessToken = data.access_token
				this._accessTokenExpiresAt = new Date(Date.now() + (parseInt(data.expires_in) * 1000))

				return resolve(this.accessToken)
			}).catch((error) => {
				return reject(error)
			})
		});
	}

	get accessToken(): string {
		return this._accessToken
	}

	get accessTokenIsValid(): boolean {
		if (!this.accessTokenExpiresAt && this.accessTokenExpiresAt < Date.now()) {
			return false
		} else {
			return true
		}
	}

	get accessTokenExpiresAt(): number {
		return this._accessTokenExpiresAt.getTime()
	}
}
