import * as moment from "moment"
import * as request from "request-promise-native"

namespace vasttrafik {
	export class API {
		public baseUrl: string = "https://api.vasttrafik.se/bin/rest.exe/v2"

		constructor(private _accessToken: string) {
			
		}

		public getDepartures(stop: string, datetime: Date = new Date(), timeSpan: number = 60, needJourneyDetail: boolean = false): Promise<Stop> {
			return new Promise((resolve, reject) => {
				request({
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
				}).then((body) => {
					let data = JSON.parse(body)
					let departureBoard: DepartureBoard = data.DepartureBoard

					let result: Stop = vasttrafik.Parser.departures(departureBoard)

					return resolve(result)
				}).catch((error) => {
					return reject(error)
				})
			})
		}
	}
}

namespace vasttrafik {
	export class Parser {
		public static departures(response: DepartureBoard): Stop {
			let departures: RawDeparture[] = response.Departure
			let parsedDepartures: DepartureList = {}

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

				let parsedDeparture: Departure = {
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
					parsedDepartures[departure.sname] = []
				}

				parsedDepartures[departure.sname].push(parsedDeparture)
			})

			let result: Stop = {
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

namespace vasttrafik {
	export type DepartureBoard = {
		errorText?: string,
		Departure?: RawDeparture[]
		error?: string
		serverdate?: string
		servertime?: string
		noNamespaceSchemaLocation: string
	}

	export type RawDeparture = {
		accessibility?: [
			"wheelChair",
			"lowFloor"
		]
		booking?: boolean
		name: string
		sname: string
		type: string
		stopid: string
		stop: string
		time: string
		rtTime: string
		date: string
		rtDate: string
		journeyid: string
		direction: string
		night?: boolean
		track: string
		rtTrack?: string
		fgColor: string
		bgColor: string
		stroke: string
		JourneyDetailRef?: {
			ref: string
		}
		$: string
	}

	export type Stop = {
		stop: {
			id: string
			name: string
			shortName: string
		}
		departures?: DepartureList
		arrivals?: {
			[lineShortName: string]: Arrival[]
		} 
	}

	export type DepartureList = {
		[lineShortName: string]: Departure[]
	}

	export type Departure = {
		vehicle: string
		line: {
			name: string
			shortName: string
		}
		direction: {
			long: string
			short: string
		}
		departure: {
			realtime: boolean
			wait: {
				milliseconds: number
				seconds: number
				minutes: number
			}
			time: string
			date: string
			datetime: Date
		}
		track: string
		colors: {
			foreground: string
			background: string
		}
		booking: boolean
		night: boolean
		accessibility?: [
			"wheelChair",
			"lowFloor"
		]
	}

	export type Arrival = {
		line: {
			name: string
			shortName: string
		}
	}
}

export default vasttrafik
