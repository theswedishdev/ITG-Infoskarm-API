import * as request from "request-promise-native"

namespace HTTPThrottler {
	export interface HTTPThrottled {
		requestIsAllowed(): boolean
		performRequest(options: request.OptionsWithUrl): Promise<any> | request.RequestPromise
	}
}

export { HTTPThrottler }
