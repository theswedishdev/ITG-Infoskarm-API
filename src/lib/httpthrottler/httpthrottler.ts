/**
 * @since 0.0.1
 * @version 0.0.1
 * @file Main file for the HTTP Throttler
 * @module httpthrottler
 * @author Joel Eriksson <joel.eriksson@protonmail.com>
 * @copyright 2017 Joel Eriksson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as request from "request-promise-native"

/**
 * @since 0.0.1
 * @version 0.0.1
 * @namespace HTTPThrottler
 */
namespace HTTPThrottler {
	/**
	 * Interface for classes that represent a throttler for HTTP requests
	 * @since 0.0.1
	 * @version 0.0.1
	 * @interface HTTPThrottled
	 */
	export interface HTTPThrottled {
		requestIsAllowed(): boolean
		performRequest(options: request.OptionsWithUrl): Promise<any> | request.RequestPromise
	}
}

export { HTTPThrottler }
