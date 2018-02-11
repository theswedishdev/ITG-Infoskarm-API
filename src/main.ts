import * as fs from "fs"
import * as path from "path"

import * as chalk from "chalk"
import * as admin from "firebase-admin"
import * as sluggo from "sluggo"
import * as request from "request"
import * as errors from "request-promise-native/errors"
import * as moment from "moment-timezone"

import Config from "./config"
import Auth from "./lib/auth"
import apirequester from "./lib/apirequester/apirequester"
import vasttrafik from "./lib/vasttrafik/vasttrafik"
import schoolmeal from "./lib/schoolmeal/schoolmeal"
import gbgcamera from "./lib/gbgcamera/gbgcamera"

const cProperty = chalk.cyan

const cWarn = chalk.yellow

const cError = (error: string | Error): string => {
	if (error instanceof Error) {
		return chalk.red(error.message)
	}

	return chalk.red(error)
}

const cTimestamp = (timestamp: number | string | Date | moment.Moment = Date.now(), outputFormat: string = "HH:mm:ss"): string => {
	const momentStamp: string = moment(timestamp).tz("Europe/Stockholm").format(outputFormat)
	
	return `[${chalk.dim(momentStamp)}]`
}

const cLibName = (lib: string): string => {
	return `'${chalk.magenta(lib)}'`
}

/**
 * The object obtained from the config file
 * @constant {config.Config}
 */
const config: Config.Config = require(path.resolve("config", "config.json"))

admin.initializeApp({
	credential: admin.credential.cert(path.resolve("config", "firebaseServiceAccount.json")),
	databaseURL: config.firebase.databaseURL,
	storageBucket: config.firebase.storageBucket,
})

/**
 * Firebase database SDK
 * @constant {admin.database.Database}
 */
const db: admin.database.Database = admin.database()

/**
 * Firebase database root reference
 * @constant {admin.database.Reference}
 */
const rootRef: admin.database.Reference = db.ref()

/**
 * Firebase storage SDK
 */
const bucket = admin.storage().bucket();

/**
 * An instance of [[Auth]] to get an access token for Västtrafik's APIs
 * @const {Auth}
 */
const vasttrafikAuth: Auth = new Auth(config.vasttrafik.accessTokenUrl, config.vasttrafik.consumerKey, config.vasttrafik.consumerSecret)

/**
 * An instance of [[apirequester.APIRequester]] for use with [[vasttrafik.API]]
 * @constant {apirequester.APIRequester}
 */
const vasttrafikAPIRequester: apirequester.APIRequester = new apirequester.APIRequester(40, 60000)

/**
 * An instance of [[vasttrafik.API]] to handle requests to Västtrafik's APIs
 * @constant {vasttrafik.API}
 */
const vasttrafikAPI: vasttrafik.API = new vasttrafik.API(vasttrafikAPIRequester, vasttrafikAuth)

const getDepartures = () => {
	Promise.all([
		vasttrafikAPI.getDepartures("9022014001960001"), // chalmers-goteborg
		vasttrafikAPI.getDepartures("9022014003760001"), // kapellplatsen-goteborg
		vasttrafikAPI.getDepartures("9022014001970001"), // chalmers-tvargata-goteborg
		vasttrafikAPI.getDepartures("9022014001961001"), // chalmersplatsen-goteborg
	]).then((results) => {
		const vasttrafikRef: admin.database.Reference = rootRef.child("vasttrafik")

		results.forEach((result, i) => {
			if (result && result.stop.name) {
				const parsedDeparturesKey: string = sluggo(result.stop.name)

				vasttrafikRef.child("stopsLookup").child(result.stop.id).set(parsedDeparturesKey).catch((error) => {
					console.error(console.error(`${cTimestamp()} ${cLibName("vasttrafik")} Could not add ${cProperty(result.stop.id)}: ${cProperty(parsedDeparturesKey)} to Firebase.`))
				})

				vasttrafikRef.child("departures").child(parsedDeparturesKey).set(result).then(() => {
					console.log(`${cTimestamp()} ${cLibName("vasttrafik")} Wrote stop ${cProperty(result.stop.shortName)} to Firebase.`)
				}).catch((error) => {
					console.error(console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`))
				})
			} else if (result.stop.id) {
				vasttrafikRef.child("stopsLookup").child(result.stop.id).once("value", (stopLookupSnap) => {
					vasttrafikRef.child("departures").child(stopLookupSnap.val()).child("stop").once("value", (stopSnap) => {
						vasttrafikRef.child("departures").child(stopLookupSnap.val()).child("departures").set(null).then(() => {
							console.log(`${cTimestamp()} ${cLibName("vasttrafik")} Wrote stop ${cProperty(stopSnap.val().shortName)} to Firebase.`)
						}).catch((error) => {
							console.error(console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`))
						})
					})
				})
			}
		})
	}).catch((error) => {
		console.error(console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`))
	})
}

/**
 * An instance of [[apirequester.APIRequester]] for use with [[schoolmeal.API]]
 * @constant {apirequester.APIRequester}
 */
const schoolmealAPIRequester: apirequester.APIRequester = new apirequester.APIRequester(2, 12000)

/**
 * An instance of [[schoolmeal.API]] to handle requests to Skolmaten's APIs
 * @constant {schoolmeal.API}
 */
const schoolmealClient: schoolmeal.API = new schoolmeal.API(schoolmealAPIRequester, config.schoolmeal.client, config.schoolmeal.versionToken)

const getSchoolmeals = (force: boolean = false) => {
	const schoolmealSchoolId: string = "it-gymnasiet-goteborg"

	schoolmealClient.getMenu(schoolmealSchoolId, force).then((result) => {
		const schoolRef: admin.database.Reference = db.ref("schoolmeal").child("schools").child(result.school.URLName)

		schoolRef.child("school").update(result.school).then(() => {
			console.log(`${cTimestamp()} ${cLibName("schoolmeal")} Updated ${cProperty(result.school.name)} information on Firebase.`)
		}).catch((error) => {
			console.error(`${cTimestamp()} ${cLibName("schoolmeal")} ${cError(error)}`)
		})

		schoolRef.child(`${result.year}`).child(`${result.week}`).update(result).then(() => {
			console.log(`${cTimestamp()} ${cLibName("schoolmeal")} Wrote schoolmeal to Firebase. School: ${cProperty(result.school.name)} Week: ${cProperty(result.week.toString())} Year: ${cProperty(result.year.toString())}`)
		}).catch((error) => {
			console.error(`${cTimestamp()} ${cLibName("schoolmeal")} Failed to write schoolmeal to Firebase. School: ${cProperty(result.school.name)} Week: ${cProperty(result.week.toString())} Year: ${cProperty(result.year.toString())}`)
		})

		schoolRef.child("latest").set(result).then(() => {
			console.log(`${cTimestamp()} ${cLibName("schoolmeal")} Wrote latest schoolmeal to Firebase. School: ${cProperty(result.school.name)} Week: ${cProperty(result.week.toString())} Year: ${cProperty(result.year.toString())}`)
		}).catch((error) => {
			console.error(`${cTimestamp()} ${cLibName("schoolmeal")} Failed to write latest schoolmeal to Firebase. School: ${cProperty(result.school.name)} Week: ${cProperty(result.week.toString())} Year: ${cProperty(result.year.toString())}`)
		})
	}).catch((error) => {
		if (error instanceof errors.StatusCodeError) {
			if (error.statusCode === 304) {
				console.error(`${cTimestamp()} ${cLibName("schoolmeal")} Menu is already up to date from Skolmaten's API.`)
			} else {
				console.error(`${cTimestamp()} ${cLibName("schoolmeal")} ${cError("StatusCodeError")} when trying to fetch menu from Skolmaten's API. HTTP Status code: ${cError(error.statusCode)}`)
			}
		} else {
			console.error(`${cTimestamp()} ${cLibName("schoolmeal")} ${cError(error)}`)
		}
	})
}

/**
 * An instance of [[apirequester.APIRequester]] for use with [[gbgcamera.API]]
 * @constant {apirequester.APIRequester}
 */
const gbgcameraAPIRequester: apirequester.APIRequester = new apirequester.APIRequester(2, 60000)

/**
 * An instance of [[schoolmeal.API]] to handle requests to Skolmaten's APIs
 * @constant {schoolmeal.API}
 */
const gbgcameraClient: gbgcamera.API = new gbgcamera.API(gbgcameraAPIRequester, config.gbgcamera.apikey)

const getCameraImages = () => {
	const cameraId: number = 17
	const cameraImageFile: string = path.resolve("images", `${cameraId}.jpg`)

	if (!fs.existsSync(path.resolve("images"))) {
		fs.mkdirSync(path.resolve("images"))
	}

	const writeStream: NodeJS.WritableStream = fs.createWriteStream(cameraImageFile)
	
	gbgcameraClient.getCameraImage(cameraId).pipe(writeStream)

	writeStream.on("finish", () => {
		bucket.upload(cameraImageFile, {
			destination: `gbgcamera/${cameraId}/${moment.tz().tz("Europe/Stockholm").format("YYYY-MM-DD_HH-mm")}.jpg`,
			gzip: true,
		}).then((data) => {
			const file = data[0];
			return file.getSignedUrl({
				action: "read",
				expires: moment.tz().tz("Europe/Stockholm").add(7, "d").toISOString()
			})
		}).then((data) => {
			const url = data[0];

			return rootRef.child("gbgcamera").child(cameraId.toString()).set({
				image: url,
				lastmodified: admin.database.ServerValue.TIMESTAMP
			})
		}).then(() => {
			console.log(`${cTimestamp()} ${cLibName("gbgcamera")} Wrote camera ${cProperty(cameraId.toString())} to Firebase`)
		}).catch((error) => {
			console.error(`${cTimestamp()} ${cLibName("gbgcamera")} ${cError(error)}`)
				
			return
		})
	})
}

/**
 * @constant {NodeJS.Timer}
 */
const mainInterval: NodeJS.Timer = setInterval(() => {
	let seconds: number = parseInt(moment().format("s"))
	let minutes: number = parseInt(moment().format("m"))

	let hhmmss: string = moment().format("HH:mm:ss")

	if (seconds % 30 === 0) {
		getCameraImages()
	}

	if (seconds % 10 === 0) {
		getDepartures()
	}

	if (minutes % 30 === 0 && seconds === 0) {
		getSchoolmeals()
	}

	if (hhmmss === "00:00:00") {
		getSchoolmeals(true)
	}
}, 1000)
