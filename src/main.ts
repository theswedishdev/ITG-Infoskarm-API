import * as path from "path"
import * as admin from "firebase-admin"
import Auth from "./lib/auth"
import vasttrafik from "./lib/vasttrafik/vasttrafik"

namespace config {
	type FirebaseCredentials = {
		type: string
		project_id: string
		private_key_id: string
		private_key: string
		client_email: string
		client_id: string
		auth_uri: string
		token_uri: string
		auth_provider_x509_cert_url: string
		client_x509_cert_url: string
	}

	type FirebaseConfig = {
		databaseURL: string,
		credential: FirebaseCredentials
	}

	type VasttrafikConfig = {
		accessTokenUrl: string
		consumerKey: string
		consumerSecret: string
	}

	export type Config = {
		firebase: FirebaseConfig
		vasttrafik: VasttrafikConfig
	}
}

const config: config.Config = require(path.resolve("config", "config.json"))

admin.initializeApp({
	credential: admin.credential.cert(config.firebase.credential),
	databaseURL: config.firebase.databaseURL
})

const db = admin.database();

const vasttrafikAuth: Auth = new Auth(config.vasttrafik.accessTokenUrl, config.vasttrafik.consumerKey, config.vasttrafik.consumerSecret)

let vasttrafikApi: vasttrafik.API

vasttrafikAuth.getAccessToken().then((accessToken) => {	
	vasttrafikApi = new vasttrafik.API(accessToken)

	return vasttrafikApi.getDepartures("9021014001960000")
}).then((result) => {
	console.dir(result, {
		depth: 10
	})
	process.exit(0)
}).catch((error) => {
	console.error(error)
})
