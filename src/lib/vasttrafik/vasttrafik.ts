import * as request from "request-promise-native"

namespace vasttrafik {
	export class API {
		public baseUrl: string = "https://api.vasttrafik.se/bin/rest.exe/v2"

		constructor(private _accessToken: string) {
			
		}

		public getDepartures(stop: string, datetime: Date = new Date(), needJourneyDetail?: boolean): Promise<Stop> {
			return new Promise((resolve, reject) => {
				request({
					url: `${this.baseUrl}/departureBoard`,
					method: "GET",
					qs: {
						id: stop,
						date: `${datetime.getFullYear()}-${datetime.getMonth()}-${datetime.getDay()}`,
						time: `${datetime.getHours()}:${datetime.getMinutes()}:${datetime.getSeconds()}`,
						needJourneyDetail: needJourneyDetail ? "1" : "0",
						timeSpan: 60,
						format: "json",
					},
					headers: {
						"Authorization": `Bearer ${this._accessToken}`
					}
				}).then((body) => {
					let data = JSON.parse(body)
					/**
					 * @TODO
					 * Parse data to create better JSON ouput
					 */

					// let departures: Departures = {
					// 	stop: {
					// 		id: stop,
					// 		name: data.DepartureBoard.Departure[0].stop,
					// 		shortName: data.DepartureBoard.Departure[0].stop.substring(0, data.DepartureBoard.Departure[0].stop.indexOf(","))
					// 	},
					// 	departures: data.DepartureBoard.Departure
					// }

					let result: Stop = vasttrafik.Parser.departures(data.DepartureBoard.Departure)

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
		public static departures(departures: RawDeparture[]): Stop {
			let parsedDepartures: Departure[] = []

			departures.forEach((departure, _) => {
				let parseDeparture: Departure = {
					line: {
						name: departure.name,
						shortName: departure.sname
					}
				}
				
				parsedDepartures.push(parseDeparture)
			})

			let result: Stop = {
				stop: {
					id: departures[0].stopid,
					name: departures[0].stop,
					shortName: departures[0].stop.substring(0, departures[0].stop.indexOf(","))
				},
				departures: parsedDepartures
			}

			return result
		}
	}
}

namespace vasttrafik {
	export type RawDeparture = {
		name: string
		sname: string
		type: string
		stopid: string
		stop: string
		time: string
		date: string
		journeyid: string
		direction: string
		track: string
		fgColor: string
		bgColor: string
		stroke: string
		$: string
	}

	export type Stop = {
		stop: {
			id: string
			name: string
			shortName: string
		}
		departures: Departure[]
	}

	export type Departure = {
		line: {
			name: string
			shortName: string
		}		
	}
}

export default vasttrafik
