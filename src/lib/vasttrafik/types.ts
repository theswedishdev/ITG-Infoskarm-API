/// <reference path="./vasttrafik.ts" />

namespace vasttrafik.types {
	export type RawDeparture = {
		name: string
		sname: string
		type: string
		stopid: string
		stop: string
		time: string
		date: string
		journeyid: string
		direction: string
		track: string
		fgColor: string
		bgColor: string
		stroke: string
		$: string
	}

	export type Stop = {
		stop: {
			id: string
			name: string
			shortName: string
		}
		departures: Departure[]
	}

	export type Departure = {
		line: {
			name: string
			shortName: string
		}		
	}
}

export default vasttrafik
