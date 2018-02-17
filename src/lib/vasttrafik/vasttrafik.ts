/**
 * Main file for the Västtrafik API wrapper
 * @since 0.0.1
 * @module vasttrafik
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @copyright 2017-2018 Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as moment from "moment-timezone"

import Auth from "../auth"
import { HTTPThrottler } from "../httpthrottler/httpthrottler"
import { vasttrafik as vasttrafikTypes } from "./types"
import { vasttrafik as vasttrafikParser } from "./parser"

/**
 * @since 0.0.1
 * @namespace vasttrafik
 */
namespace vasttrafik {
	/**
	 * @since 0.0.1
	 * @class API
	 * @classdesc Perform calls to the the Västtrafik API
	 */
	export class API {
		/**
		 * Base URL for Västtrafik's API
		 * @property
		 * @readonly
		 * @public
		 */
		public baseURL: string = "https://api.vasttrafik.se/bin/rest.exe/v2"

		/**
		 * moment-timezone Zone object
		 * @property
		 * @readonly
		 * @public
		 */
		public zone: moment.MomentZone = moment.tz.zone("Europe/Stockholm")

		/**
		 * The access token to use for authorization
		 * @property
		 * @private
		 */
		private _accessToken: string = ""

		/**
		 * @since 0.0.1
		 * @param {HTTPThrottler.HTTPThrottled} apiRequester - An instance of a class implementing the [[HTTPThrottler.HTTPThrottled]] interface
		 * @param {Auth} _auth - An instance of [[Auth]]
		 * @returns {vasttrafik.API}
		 */
		constructor(public apiRequester: HTTPThrottler.HTTPThrottled, private _auth: Auth) {
			
		}

		/**
		 * GET data from the Västtrafik's "departureBoard" endpoint
		 * @since 0.1.0
		 * @param {string} stop - The ID of the stop to get departures from
		 * @param {moment.Moment} datetime - The time and date of which to get departures
		 * @param {number} timeSpan - To get the next departures in a specified timespan of up to 24 hours, in minutes
		 * @param {boolean} needJourneyDetail - Whether or not the reference URL for the journey detail service is needed
		 * @returns {Promise<Stop>}
		 * @private
		 */
		private _getRawDepartures(stop: string, datetime: moment.Moment, timeSpan: number = 60, needJourneyDetail: boolean = false): Promise<any> {
			return this._auth.getAccessToken().then((accessToken) => {
				return this.apiRequester.performRequest({
					method: "GET",
					url: `${this.baseURL}/departureBoard`,
					responseType: "json",
					params: {
						id: stop,
						date: datetime.format("YYYY-MM-DD"),
						time: datetime.format("HH:mm:ss"),
						needJourneyDetail: needJourneyDetail ? "1" : "0",
						timeSpan: timeSpan,
						format: "json",
					},
					headers: {
						"Authorization": `Bearer ${accessToken}`
					}
				})
			}).catch((error) => {
				console.error(error.message)
			})
		}

		/**
		 * GET and parse data from the Västtrafik's "departureBoard" endpoint
		 * @since 0.0.1
		 * @param {string} stop - The ID of the stop to get departures from
		 * @param {moment.Moment} datetime - The time and date of which to get departures
		 * @param {number} timeSpan - To get the next departures in a specified timespan of up to 24 hours, in minutes
		 * @param {boolean} needJourneyDetail - Whether or not the reference URL for the journey detail service is needed
		 * @returns {Promise<Stop>}
		 * @public
		 */
		public getDepartures(stop: string, datetime: moment.Moment = moment.tz("UTC"), timeSpan: number = 60, needJourneyDetail: boolean = false): Promise<vasttrafikTypes.Stop> {
			datetime = datetime.tz("Europe/Stockholm")

			return new Promise((resolve, reject) => {
				this._getRawDepartures(stop, datetime, timeSpan, needJourneyDetail).then((response) => {
					const data = response.data
					const departureBoard: vasttrafikTypes.DepartureBoard = data.DepartureBoard

					const result: vasttrafikTypes.Stop = vasttrafikParser.Parser.departures(departureBoard, stop)

					return resolve(result)
				}).catch(function(error) {
					return reject(error)
				})
			})
		}
	}
}

export default vasttrafik
