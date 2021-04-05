import { HTTPThrottler } from "../httpthrottler/httpthrottler"

namespace gbgcamera {
	export class API {
		public baseURL: string = "http://data.goteborg.se/TrafficCamera/v1.0"
		public cameraImageURL: string = `${this.baseURL}/CameraImage`
		public trafficCamerasURL: string = `${this.baseURL}/TrafficCameras`

		constructor(public apiRequester: HTTPThrottler.HTTPThrottled, private _apikey: string) {
			this.cameraImageURL += `/${this._apikey}`
			this.trafficCamerasURL += `/${this._apikey}`
		}

		public getCameraImage(camera: string | number) {
			return this.apiRequester.performRequest({
				method: "GET",
				url: `${this.cameraImageURL}/${camera}`,
				responseType: "stream",
			})
		}

		public getCameras(): Promise<any> {
			return this.apiRequester.performRequest({
				method: "GET",
				url: this.trafficCamerasURL,
				responseType: "json",
				params: {
					format: "json"
				}
			})
		}
	}
}

export default gbgcamera
