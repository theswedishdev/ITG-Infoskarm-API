/**
 * Västtrafik API wrapper types
 * @since 0.0.1
 * @module vasttrafik
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @copyright 2017-2018 Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

/**
 * @since 0.0.1
 * @namespace vasttrafik
 */
declare namespace vasttrafik {
	/**
	 * @since 0.0.1
	 */
	export type DepartureBoard = {
		errorText?: string,
		Departure?: RawDeparture | RawDeparture[]
		error?: string
		serverdate?: string
		servertime?: string
		noNamespaceSchemaLocation: string
	}

	/**
	 * @since 0.0.1
	 */
	export type RawDeparture = {
		accessibility?: [
			"wheelChair",
			"lowFloor"
		]
		booking?: boolean
		name: string
		sname: string
		type: string
		stopid: string
		stop: string
		time: string
		rtTime: string
		date: string
		rtDate: string
		journeyid: string
		direction: string
		night?: boolean
		track: string
		rtTrack?: string
		fgColor: string
		bgColor: string
		stroke: string
		JourneyDetailRef?: {
			ref: string
		}
		$: string
	}

	/**
	 * @since 0.0.1
	 */
	export type Stop = {
		stop: {
			id: string
			name?: string
			shortName?: string
		}
		departures?: DepartureList
	}

	/**
	 * @since 0.0.1
	 */
	export type DepartureList = {
		[lineShortName: string]: {
			[directionShort: string]: Departure[]
		}
	}

	/**
	 * @since 0.0.1
	 */
	export type Departure = {
		vehicle: string
		line: {
			name: string
			shortName: string
		}
		direction: {
			long: string
			short: string
		}
		departure: {
			realtime: boolean
			wait: {
				milliseconds: number
				seconds: number
				minutes: number
			}
			time: string
			date: string
			datetime: Date
		}
		track: string
		colors: {
			foreground: string
			background: string
		}
		booking: true | null
		night: true | null
		accessibility: [ "wheelChair", "lowFloor" ] | null
	}
}

export { vasttrafik }
