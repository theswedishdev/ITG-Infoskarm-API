import * as moment from "moment"
import * as request from "request-promise-native"
import { HTTPThrottler } from "../httpthrottler/httpthrottler"
import { vasttrafikTypes } from "./types"

namespace vasttrafik {
	export class APIRequester implements HTTPThrottler.HTTPThrottled {
		public lastTokenRefill: Date
		public tokens: number

		constructor(public maxTokens: number, public tokensRefillRateInMs: number) {
			this.lastTokenRefill = new Date(Date.now())
			this.tokens = maxTokens
		}

		public refillTokens(): boolean {
			if ((this.lastTokenRefill.getTime() + this.tokensRefillRateInMs) > Date.now()) {
				return false
			} else {
				this.tokens = this.maxTokens
				return true
			}
		}

		public requestIsAllowed(): boolean {
			this.refillTokens()

			if (this.tokens > 0) {
				this.tokens--
				return true
			} else {
				return false
			}
		}

		public performRequest(options: request.OptionsWithUrl): Promise<any> {
			if (!this.requestIsAllowed()) {
				return Promise.reject(new Error("This request has been HTTPThrottled and will not be handled"))	
			} else {
				return request(options).promise()
			}
		}
	}

	export class API {
		public baseUrl: string = "https://api.vasttrafik.se/bin/rest.exe/v2"

		constructor(private _accessToken: string, public apiRequester: vasttrafik.APIRequester) {
			
		}

		public getDepartures(stop: string, datetime: Date = new Date(), timeSpan: number = 60, needJourneyDetail: boolean = false): Promise<vasttrafikTypes.Stop> {
			return new Promise((resolve, reject) => {
				this.apiRequester.performRequest({
					url: `${this.baseUrl}/departureBoard`,
					method: "GET",
					qs: {
						id: stop,
						date: `${datetime.getFullYear()}-${datetime.getMonth() + 1}-${datetime.getDate()}`,
						time: `${datetime.getHours()}:${datetime.getMinutes()}:${datetime.getSeconds()}`,
						needJourneyDetail: needJourneyDetail ? "1" : "0",
						timeSpan: timeSpan,
						format: "json",
					},
					headers: {
						"Authorization": `Bearer ${this._accessToken}`
					}
				}).then(function(body) {
					let data = JSON.parse(body)
					let departureBoard: vasttrafikTypes.DepartureBoard = data.DepartureBoard

					let result: vasttrafikTypes.Stop = vasttrafik.Parser.departures(departureBoard)

					return resolve(result)
				}).catch(function(error) {
					return reject(error)
				})
			})
		}
	}
}

namespace vasttrafik {
	export class Parser {
		public static departures(response: vasttrafikTypes.DepartureBoard): vasttrafikTypes.Stop {
			let departures: vasttrafikTypes.RawDeparture[] = response.Departure
			let parsedDepartures: vasttrafikTypes.DepartureList = {}

			let serverMoment: moment.Moment = moment(`${response.serverdate} ${response.servertime}`, "YYYY-MM-DD HH:mm")

			departures.forEach((departure, _) => {
				let shortDirection = departure.direction.indexOf(" via") > 0 ? departure.direction.substr(0, departure.direction.indexOf(" via")) : departure.direction
				shortDirection = shortDirection.indexOf(",") > 0 ? shortDirection.substr(0, shortDirection.indexOf(",")) : shortDirection

				let realtime = true
				let date: string
				let time: string
				
				// If there is no real-time departure date use the timetable departure date
				if (departure.rtDate) {
					date = departure.rtDate
				} else {
					realtime = false
					date = departure.date
				}
				
				// If there is no real-time departure time use the timetable departure time
				if (departure.rtTime) {
					time = departure.rtTime
				} else {
					realtime = false
					time = departure.time
				}

				// Moment of departure
				let departureMoment: moment.Moment = moment(`${date} ${time}`, "YYYY-MM-DD HH:mm")

				// Difference in milliseconds between time of server and time of departure
				let departureMomentDiff: number = departureMoment.diff(serverMoment)

				let parsedDeparture: vasttrafikTypes.Departure = {
					vehicle: departure.type,
					line: {
						name: departure.name,
						shortName: departure.sname,
					},
					direction: {
						long: departure.direction,
						short: shortDirection,
					},
					departure: {
						realtime: realtime,
						wait: {
							milliseconds: departureMomentDiff,
							seconds: departureMomentDiff / 1000,
							minutes: parseInt(moment(departureMomentDiff).format("m")),
						},
						date: date,
						time: time,
						datetime: departureMoment.toDate(),
					},
					track: departure.rtTrack ? departure.rtTrack : departure.track,
					colors: {
						foreground: departure.bgColor,
						background: departure.fgColor,
					},
					booking: departure.booking ? departure.booking : false,
					night: departure.night ? departure.night : false,
					accessibility: departure.accessibility ? departure.accessibility : null
				}

				if (!parsedDepartures.hasOwnProperty(departure.sname)) {
					parsedDepartures[departure.sname] = {}
				}

				if (!parsedDepartures[departure.sname].hasOwnProperty(shortDirection.toLowerCase())) {
					parsedDepartures[departure.sname][shortDirection.toLowerCase()] = []
				}

				parsedDepartures[departure.sname][shortDirection.toLowerCase()].push(parsedDeparture)
			})

			let result: vasttrafikTypes.Stop = {
				stop: {
					id: departures[0].stopid,
					name: departures[0].stop,
					shortName: departures[0].stop.substr(0, departures[0].stop.indexOf(","))
				},
				departures: parsedDepartures
			}

			return result
		}
	}
}

export default vasttrafik
