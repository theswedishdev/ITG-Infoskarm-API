import * as path from "path"

import chalk from "chalk"
import * as axios from "axios"
import * as admin from "firebase-admin"
import * as urlSlug from "url-slug"
import * as moment from "moment-timezone"
import * as aws4 from "aws4"
import { compress as brotliCompress } from 'iltorb'

import Config from "./config"
import Auth from "./lib/auth"
import apirequester from "./lib/apirequester/apirequester"
import vasttrafik from "./lib/vasttrafik/vasttrafik"
import schoolmeal from "./lib/schoolmeal/schoolmeal"
import gbgcamera from "./lib/gbgcamera/gbgcamera"

const cProperty = chalk.cyan

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
 * An instance of [[Auth]] to get an access token for Västtrafik's APIs
 * @const {Auth}
 */
const vasttrafikAuth: Auth = new Auth(config.vasttrafik.accessTokenUrl, config.vasttrafik.consumerKey, config.vasttrafik.consumerSecret)

/**
 * An instance of [[apirequester.APIRequester]] for use with [[vasttrafik.API]]
 * @constant {apirequester.APIRequester}
 */
const vasttrafikAPIRequester: apirequester.APIRequester = new apirequester.APIRequester(200, 60000)

/**
 * An instance of [[vasttrafik.API]] to handle requests to Västtrafik's APIs
 * @constant {vasttrafik.API}
 */
const vasttrafikAPI: vasttrafik.API = new vasttrafik.API(vasttrafikAPIRequester, vasttrafikAuth)

type StopToFetch = {
	id: string
	key: string
	name: string
	active: boolean
	timeSpan: number
}

/**
 * A array containing the stops that should be fetched, kept in sync with Firebase
 */
let stopsToFetch: StopToFetch[] = []

rootRef.child("vasttrafik").child("stops").on("value", (stopsSnap: admin.database.DataSnapshot) => {
	const newStopsToFetch: StopToFetch[] = []

	// @ts-ignore
	stopsSnap.forEach((stopSnap) => {
		newStopsToFetch.push({
			...stopSnap.val(),
			key: stopSnap.key,
		})
	})

	stopsToFetch = newStopsToFetch
})

const getDepartures = () => {
	/**
	 * An array of promises to fetch Västtrafik stops
	 * @constant {Promise[]}
	 */
	const stopFetches = []
	stopsToFetch.forEach((stop) => {
		stopFetches.push(vasttrafikAPI.getDepartures(stop.id, moment(), stop.timeSpan))
	})

	Promise.all(stopFetches).then((results) => {
		const vasttrafikRef: admin.database.Reference = rootRef.child("vasttrafik")

		results.forEach((result, i) => {			
			if (result && result.stop.name) {
				const parsedDeparturesKey: string = urlSlug(result.stop.name)

				vasttrafikRef.child("stopsLookup").child(result.stop.id).set(parsedDeparturesKey).catch((error) => {
					console.error(`${cTimestamp()} ${cLibName("vasttrafik")} Could not add ${cProperty(result.stop.id)}: ${cProperty(parsedDeparturesKey)} to Firebase.`)
				})

				vasttrafikRef.child("departures").child(parsedDeparturesKey).set(result).then(() => {
					console.log(`${cTimestamp()} ${cLibName("vasttrafik")} Wrote stop ${cProperty(result.stop.shortName)} to Firebase.`)
				}).catch((error) => {
					console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`)
				})
			} else if (result.stop.id) {
				vasttrafikRef.child("stopsLookup").child(result.stop.id).once("value", (stopLookupSnap) => {
					let stopKey = stopLookupSnap.val()

					if (!stopKey) {
						({ key: stopKey } = stopsToFetch.find((stopToFetch) => {
							return result.stop.id === stopToFetch.id
						}))

						if (!stopKey) {
							return
						}
					}

					vasttrafikRef.child("departures").child(stopKey).child("stop").once("value", (stopSnap) => {
						vasttrafikRef.child("departures").child(stopKey).child("departures").set(null).then(() => {
							console.log(`${cTimestamp()} ${cLibName("vasttrafik")} Wrote stop ${cProperty(stopSnap.val().shortName)} to Firebase.`)
						}).catch((error) => {
							console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`)
						})
					})
				})
			}
		})
	}).catch((error) => {
		console.error(`${cTimestamp()} ${cLibName("vasttrafik")} ${cError(error)}`)
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
		console.error(error)
	})
}

/**
 * An instance of [[apirequester.APIRequester]] for use with [[gbgcamera.API]]
 * @constant {apirequester.APIRequester}
 */
const gbgcameraAPIRequester: apirequester.APIRequester = new apirequester.APIRequester(config.gbgcamera.cameras.length * 2, 60000)

/**
 * An instance of [[gbgcamera.API]] to handle requests to Göteborg Stad's APIs
 * @constant {gbgcamera.API}
 */
const gbgcameraClient: gbgcamera.API = new gbgcamera.API(gbgcameraAPIRequester, config.gbgcamera.apikey)

const getCameraImages = () => {
	config.gbgcamera.cameras.forEach((cameraId) => {	
		gbgcameraClient.getCameraImage(cameraId).then((cameraResponse) => {
			const currentMoment = moment.tz().tz("Europe/Stockholm")
			const canonicalUri = `/gbgcamera/${cameraId}/${currentMoment.format("YYYY-MM-DD_HH-mm")}.jpg`
			
			const imageChunks = []
			cameraResponse.data.on("data", (data) => {
				imageChunks.push(data);
			})

			cameraResponse.data.on("end", () => {
				const imageFile = Buffer.concat(imageChunks)
				let compressedImageFile
				
				brotliCompress(imageFile).then((output) => {
					compressedImageFile = output;
				}).catch((error) => {
					console.error(`${cTimestamp()} ${cLibName("gbgcamera")} ${cError(error)}`)
				})

				const {
					headers: awsHeaders
				} = aws4.sign({
					host: `${config.s3.bucket}.${config.s3.host}`,
					method: "PUT",
					path: canonicalUri,
					body: compressedImageFile ? compressedImageFile : imageFile,
					service: "s3",
					region: config.s3.region,
					headers: {
						"Content-Type": "image/jpeg",
					},
				}, {
					accessKeyId: config.s3.accessKeyId,
					secretAccessKey: config.s3.secretAccessKey,
				})

				delete awsHeaders["Host"]

				axios.default.request({
					url: canonicalUri,
					method: "PUT",
					baseURL: `https://${config.s3.bucket}.${config.s3.host}`,
					headers: {
						...awsHeaders,
						"Cache-Control": moment.duration(1, "years").asSeconds(),
						"Content-Disposition": "inline",
						"x-amz-acl": "public-read",
						"x-amz-storage-class": "STANDARD",
					},
					data: compressedImageFile ? compressedImageFile : imageFile,
					transformRequest: [
						(data, headers) => {
							if (compressedImageFile) {
								headers["Content-Encoding"] = "br"
							}
						
							return data
						},
					],
				}).then((uploadResponse) => {
					console.log(`${cTimestamp()} ${cLibName("gbgcamera")} Uploaded camera ${cProperty(cameraId.toString())} to DigitalOcean spaces.`)

					return rootRef.child("gbgcamera").child(cameraId.toString()).set({
						image: uploadResponse.config.url,
						lastmodified: admin.database.ServerValue.TIMESTAMP
					})
				}).then(() => {
					console.log(`${cTimestamp()} ${cLibName("gbgcamera")} Wrote camera ${cProperty(cameraId.toString())} to Firebase.`)
				}).catch((error: axios.AxiosError) => {
					console.error(`${cTimestamp()} ${cLibName("gbgcamera")} ${cError(error)}`)
				})
			})
		}).catch((error) => {
			console.error(`${cTimestamp()} ${cLibName("gbgcamera")} ${cError(error)}`)
		})
	})
}

setInterval(() => {
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
