import * as request from "request-promise-native"
import { HTTPThrottler } from "../httpthrottler/httpthrottler"

namespace gbgcamera {
	export class API {
		public baseURL: string = "http://data.goteborg.se/TrafficCamera/v0.2"
		public cameraImageURL: string = `${this.baseURL}/CameraImage`
		public trafficCamerasURL: string = `${this.baseURL}/TrafficCameras`

		constructor(public apiRequester: HTTPThrottler.HTTPThrottled, private _apikey: string) {
			this.cameraImageURL += `/${_apikey}`
			this.trafficCamerasURL += `/${_apikey}`
		}

		public getCameraImage(camera: string | number) {
			return this.apiRequester.performRequest({
				url: `${this.cameraImageURL}/${camera}`,
			})
		}

		public getCameras(): Promise<any> {
			return this.apiRequester.performRequest({
				url: this.trafficCamerasURL,
				qs: {
					format: "json"
				}
			})
		}
	}
}

export default gbgcamera
