/**
 * @since 0.0.1
 * @version 0.0.1
 * @file Västtrafik API wrapper types
 * @module vasttrafik
 * @author Joel Eriksson <joel.eriksson@protonmail.com>
 * @copyright 2017 Joel Eriksson <joel.eriksson@protonmail.com>
 * @license MIT
 */

/**
 * @since 0.0.1
 * @version 0.0.1
 * @namespace vasttrafik
 */
namespace vasttrafik {
	export type DepartureBoard = {
		errorText?: string,
		Departure?: RawDeparture[]
		error?: string
		serverdate?: string
		servertime?: string
		noNamespaceSchemaLocation: string
	}

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

	export type Stop = {
		stop: {
			id: string
			name: string
			shortName: string
		}
		departures?: DepartureList
		arrivals?: {
			[lineShortName: string]: Arrival[]
		} 
	}

	export type DepartureList = {
		[lineShortName: string]: {
			[directionShort: string]: Departure[]
		}
	}

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
		booking: boolean
		night: boolean
		accessibility?: [
			"wheelChair",
			"lowFloor"
		]
	}

	export type Arrival = {
		line: {
			name: string
			shortName: string
		}
	}
}

export { vasttrafik }
