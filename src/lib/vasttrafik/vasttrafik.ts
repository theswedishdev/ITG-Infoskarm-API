/**
 * @since 0.0.1
 * Main file for the Västtrafik API wrapper
 * @version 0.0.3
 * @module vasttrafik
 * @author Joel Eriksson <joel.eriksson@protonmail.com>
 * @copyright 2017 Joel Eriksson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as moment from "moment"
import * as request from "request-promise-native"
import { HTTPThrottler } from "../httpthrottler/httpthrottler"
import { vasttrafik as vasttrafikTypes } from "./types"
import { vasttrafik as vasttrafikParser } from "./parser"

/**
 * @since 0.0.1
 * @version 0.0.3
 * @namespace vasttrafik
 */
namespace vasttrafik {
	/**
	 * Base class for interfacing with HTTP.
	 * @since 0.0.3
	 * @version 0.0.3
	 * @class BaseAPIRequester
	 * @implements HTTPThrottler.HTTPThrottled
	 */
	export abstract class BaseAPIRequester implements HTTPThrottler.HTTPThrottled {
		/**
		 * For the implementation of [[HTTPThrottler.HTTPThrottled]]
		 * @since 0.0.3
		 * @version 0.0.3
		 * @throws Error
		 */
		public requestIsAllowed(): boolean {
			throw new Error("requestIsAllowed has not been implemented in BaseAPIRequester")
		}

		/**
		 * For the implementation of [[HTTPThrottler.HTTPThrottled]]
		 * @since 0.0.3
		 * @version 0.0.3
		 * @throws Error
		 */
		public performRequest(options: request.OptionsWithUrl): Promise<any> | request.RequestPromise {
			throw new Error("requestIsAllowed has not been implemented in BaseAPIRequester")
		}
	}

	/**
	 * Perform HTTP throttled requests with a tokenbucket implementation. All requests that exceed the tokenbucket limit will be dropped.
	 * @since 0.0.1
	 * @version 0.0.3
	 * @class APIRequester
	 * @extends BaseAPIRequester
	 */
	export class APIRequester extends BaseAPIRequester {
		/**
		 * When the tokenbucket was last refilled
		 * @readonly
		 * @public
		 */
		public lastTokenRefill: Date
		/**
		 * Amount of tokens left
		 * @readonly
		 * @public
		 */
		public tokens: number

		/**
		 * @since 0.0.1
		 * @version 0.0.3
		 * @param {number} maxTokens - The amount of tokens that can be consumed during the interval
	     * @param {number} tokensRefillRateInMs - How often tokens will be refilled, in milliseconds
		 * @returns {vasttrafik.BaseAPIRequester}
		 */
		constructor(public maxTokens: number, public tokensRefillRateInMs: number) {
			super()
			this.lastTokenRefill = new Date(Date.now())
			this.tokens = maxTokens
		}

		/**
		 * Refills the tokenbucket if it was has not already been filled during the current timeframe
		 * @since 0.0.1
		 * @version 0.0.1
		 * @method refillTokens
		 * @returns {boolean}
		 * @public
		 */
		public refillTokens(): boolean {
			if ((this.lastTokenRefill.getTime() + this.tokensRefillRateInMs) > Date.now()) {
				return false
			} else {
				this.tokens = this.maxTokens
				return true
			}
		}

		/**
		 * Checks if there are tokens left in the tokenbucket to use for a request
		 * @since 0.0.1
		 * @version 0.0.1
		 * @method requestIsAllowed
		 * @returns {boolean}
		 * @public
		 */
		public requestIsAllowed(): boolean {
			this.refillTokens()

			if (this.tokens > 0) {
				this.tokens--
				return true
			} else {
				return false
			}
		}

		/**
		 * Performs the request if the tokenbucket has tokens left to use
		 * @since 0.0.1
		 * @version 0.0.1
		 * @method performRequest
		 * @param {request.OptionsWithUrl} options
		 * @public
		 */
		public performRequest(options: request.OptionsWithUrl): Promise<any> {
			if (!this.requestIsAllowed()) {
				return Promise.reject(new Error("This request has been HTTPThrottled and will not be handled"))	
			} else {
				return request(options).promise()
			}
		}
	}

	/**
	 * @since 0.0.1
	 * @version 0.0.1
	 * @class API
	 * @classdesc Perform calls to the the Västtrafik API
	 */
	export class API {
		/**
		 * Base URL for the Västtrafik API
		 * @readonly
		 * @public
		 */
		public baseUrl: string = "https://api.vasttrafik.se/bin/rest.exe/v2"

		/**
		 * @since 0.0.1
		 * @version 0.0.3
		 * @param {string} _accessToken - The access token to use for authorization
		 * @param {HTTPThrottler.HTTPThrottled} apiRequester - An instance of a class implementing the [[HTTPThrottler.HTTPThrottled]] interface
		 * @returns {vasttrafik.API}
		 */
		constructor(private _accessToken: string, public apiRequester: HTTPThrottler.HTTPThrottled) {
			
		}

		/**
		 * GET and parse data from the Västtrafik's "departureBoard" endpoint
		 * @since 0.0.1
		 * @version 0.0.3
		 * @param {string} stop - The ID of the stop to get departures from
		 * @param {Date} datetime - The time and date of which to get departures
		 * @param {number} timeSpan - To get the next departures in a specified timespan of up to 24 hours, in minutes
		 * @param {boolean} needJourneyDetail - Whether or not the reference URL for the journey detail service is needed
		 * @returns {Promise<Stop>}
		 * @public
		 */
		public getDepartures(stop: string, datetime: Date = new Date(), timeSpan: number = 60, needJourneyDetail: boolean = false): Promise<vasttrafikTypes.Stop> {
			return new Promise(function(resolve, reject) {
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

					let result: vasttrafikTypes.Stop = vasttrafikParser.Parser.departures(departureBoard)

					return resolve(result)
				}).catch(function(error) {
					return reject(error)
				})
			})
		}
	}
}

export default vasttrafik
