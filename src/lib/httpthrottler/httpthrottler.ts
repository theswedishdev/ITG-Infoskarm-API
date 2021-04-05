/**
 * @since 0.0.1
 * @file Main file for the HTTP Throttler
 * @module httpthrottler
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as axios from "axios"

/**
 * @since 0.0.1
 * @namespace HTTPThrottler
 */
namespace HTTPThrottler {
	/**
	 * Interface for classes that represent a throttler for HTTP requests
	 * @since 0.0.1
	 * @interface HTTPThrottled
	 */
	export interface HTTPThrottled {
		requestIsAllowed(): boolean
		performRequest(options: axios.AxiosRequestConfig)
	}
}

export { HTTPThrottler }
