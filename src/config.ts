/**
 * Namespace for the config.json file
 * @since 0.0.1
 * @namespace Config
 */
declare namespace Config {
	export type FirebaseConfig = {
		databaseURL: string
		storageBucket: string
	}

	export type SchoolmealConfig = {
		client: string
		versionToken?: string
	}

	export type VasttrafikConfig = {
		accessTokenUrl: string
		consumerKey: string
		consumerSecret: string
	}

	export type GBGCameraConfig = {
		apikey: string
		cameras: number[]
	}
	
	export type Config = {
		firebase: FirebaseConfig
		schoolmeal: SchoolmealConfig
		vasttrafik: VasttrafikConfig
		gbgcamera: GBGCameraConfig
	}
}

export default Config
