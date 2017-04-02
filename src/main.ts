import * as path from "path"
import * as admin from "firebase-admin"
import * as slugg from "slugg"
import Auth from "./lib/auth"
import vasttrafik from "./lib/vasttrafik/vasttrafik"

/**
 * Namespace for the config.json file
 * @since 0.0.1
 * @version 0.0.1
 * @namespace config
 */
namespace config {
	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 */
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

	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 */
	type FirebaseConfig = {
		databaseURL: string,
		credential: FirebaseCredentials
	}

	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 */
	type VasttrafikConfig = {
		accessTokenUrl: string
		consumerKey: string
		consumerSecret: string
	}

	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 */
	export type Config = {
		firebase: FirebaseConfig
		vasttrafik: VasttrafikConfig
	}
}

/**
 * The object obtained from the config file
 * @constant
 */
const config: config.Config = require(path.resolve("config", "config.json"))

admin.initializeApp({
	credential: admin.credential.cert(config.firebase.credential),
	databaseURL: config.firebase.databaseURL
})

/**
 * Firebase database SDK
 */
const db: admin.database.Database = admin.database();

/**
 * An instance of [[Auth]] to get an access token for Västtrafik's APIs
 */
const vasttrafikAuth: Auth = new Auth(config.vasttrafik.accessTokenUrl, config.vasttrafik.consumerKey, config.vasttrafik.consumerSecret)

vasttrafikAuth.getAccessToken().then((accessToken) => {
	/**
	 * An instance of [[vasttrafik.APIRequester]] for use with [[vasttrafik.API]]
	 */
	const vasttrafikAPIRequester: vasttrafik.APIRequester = new vasttrafik.APIRequester(10, 60000)

	/**
	 * An instance of [[vasttrafik.API]] to handle requests to Västtrafik's APIs
	 */
	const vasttrafikAPI: vasttrafik.API = new vasttrafik.API(accessToken, vasttrafikAPIRequester)

	return Promise.all([
		vasttrafikAPI.getDepartures("9022014001960001"),
		vasttrafikAPI.getDepartures("9022014003760001"),
		vasttrafikAPI.getDepartures("9022014001970001"),
		vasttrafikAPI.getDepartures("9022014001961001")
	])
}).then((results) => {
	/**
	 * A Firebase database reference to cache parsed data from Västtrafik
	 */
	const parsedDeparturesRef: admin.database.Reference = db.ref(`/vasttrafik/departures`)

	results.forEach((result, _) => {
		let parsedDeparturesKey = slugg(result.stop.name)

		parsedDeparturesRef.child(parsedDeparturesKey).set(result).then(() => {
			console.log(`Wrote ${result.stop.shortName} to Firebase`)
		}).catch((error) => {
			process.exit(1)
		})
	})
}).catch((error) => {
	console.error(error)
})
