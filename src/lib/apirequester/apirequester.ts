/**
 * Main file for the APIRequester
 * @module apirequester
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @copyright 2017-2018 Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as axios from "axios"
import { HTTPThrottler } from "../httpthrottler/httpthrottler"

/**
 * @since 0.0.1
 * @namespace apirequester
 */
namespace apirequester {
	/**
	 * Base class for interfacing with HTTP.
	 * @since 0.0.3
	 * @class BaseAPIRequester
	 * @implements HTTPThrottler.HTTPThrottled
	 */
	export abstract class BaseAPIRequester implements HTTPThrottler.HTTPThrottled {
		/**
		 * For the implementation of [[HTTPThrottler.HTTPThrottled]]
		 * @since 0.0.3
		 * @throws Error
		 */
		public requestIsAllowed(): boolean {
			throw new Error("requestIsAllowed has not been implemented in BaseAPIRequester")
		}

		/**
		 * For the implementation of [[HTTPThrottler.HTTPThrottled]]
		 * @since 0.0.3
		 * @throws Error
		 */
		public performRequest(options: axios.AxiosRequestConfig) {
			throw new Error("requestIsAllowed has not been implemented in BaseAPIRequester")
		}
	}

	/**
	 * Perform HTTP throttled requests with a tokenbucket implementation. All requests that exceed the tokenbucket limit will be dropped.
	 * @since 0.0.1
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

		private _httpClient: axios.AxiosInstance

		/**
		 * @since 0.0.1
		 * @param {number} maxTokens - The amount of tokens that can be consumed during the interval
	     * @param {number} tokensRefillRateInMs - How often tokens will be refilled, in milliseconds
		 */
		constructor(public maxTokens: number, public tokensRefillRateInMs: number) {
			super()
			this.lastTokenRefill = new Date(Date.now())
			this.tokens = maxTokens
			this._httpClient = axios.default.create()
		}

		/**
		 * Refills the tokenbucket if it was has not already been filled during the current timeframe
		 * @since 0.0.1
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
		 * @method performRequest
		 * @param {axios.AxiosRequestConfig} options
		 * @public
		 */
		public performRequest(options: axios.AxiosRequestConfig) {
			if (!this.requestIsAllowed()) {
				return Promise.reject(new Error("This request has been HTTPThrottled and will not be handled"))	
			} else {
				return this._httpClient.request(options)
			}
		}
	}
}

export default apirequester
