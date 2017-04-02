/**
 * Västtrafik API wrapper parser
 * @since 0.0.1
 * @module vasttrafik
 * @author Joel Eriksson <joel.eriksson@protonmail.com>
 * @copyright 2017 Joel Eriksson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as moment from "moment"
import { vasttrafik as vasttrafikTypes } from "./types"

/**
 * @since 0.0.1
 * @version 0.0.1
 * @namespace vasttrafik
 */
namespace vasttrafik {
	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 * @class Parser
	 * @classdesc Parse responses from Västtrafik's API endpoints
	 */
	export class Parser {
		/**
		 * Parse raw departureBoard responses to a format easier to work with
		 * @since 0.0.1
		 * @version 0.0.1
		 * @method departures
		 * @param {DepartureBoard} response - The raw response from Västtrafik's "departureBoard" endpoint
		 * @returns {Stop}
		 * @public
		 * @static
		 */
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

export { vasttrafik }
