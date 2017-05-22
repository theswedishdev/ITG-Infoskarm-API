/**
 * Namespace for the config.json file
 * @since 0.0.1
 * @namespace config
 */
namespace Config {
	export type FirebaseCredentials = {
		type: string
		project_id: string
		private_key_id: string
		private_key: string
		client_email: string
		client_id: string
		auth_uri: string
		token_uri: string
		auth_provider_x509_cert_url: string
		client_x509_cert_url: string
	}

	export type FirebaseConfig = {
		databaseURL: string
		credential: FirebaseCredentials
		storage: {
			bucket: string
		}
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
	}
	
	export type Config = {
		firebase: FirebaseConfig
		schoolmeal: SchoolmealConfig
		vasttrafik: VasttrafikConfig
		gbgcamera: GBGCameraConfig
	}
}

export default Config
