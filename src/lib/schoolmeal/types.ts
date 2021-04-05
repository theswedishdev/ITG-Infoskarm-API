declare namespace schoolmeal {
	export namespace RawAPI {
		export interface School {
			id: number
			name: string
			URLName: string
			imageURL: string
			district: District
		}

		export interface District {
			id: number
			name: string
			province: Province
			URLName: string
		}

		export interface Province {
			id: number
			name: string
			URLName: string
		}

		export interface API {
			feedbackAllowed: boolean
			weeks: Week[]
			school: School
			id: number
			bulletins: Bulletin[]
		}

		export interface Week {
			days: Day[]
			number: number
			year: number
		}

		export interface Day {
			date: number
			reason?: string
			meals?: Meal[]
		}
		
		export interface Meal {
			value: string
			attributes?: number[]
		}
		
		export interface Bulletin {
			text: string
		}
	}

	export namespace Menu {
		export interface WeekMenu {
			year: number
			week: number
			school: School
			days: {
				[dddd: string]: Menu
			}
			bulletins?: Bulletin[]
			lastModified: number
		}

		export interface Menu {
			date: number
			open: boolean
			meals?: Meal[]
			reason?: string
		}

		export interface Meal {
			value: string
			attributes?: Attribute[]
		}

		export interface Attribute {
			id: number
		}

		export interface Bulletin {
			text: string
		}
	}

	export interface Year {
		[years: number]: Week
	}

	export interface Week {
		[week: number]: Menu.Menu
	}

	export interface School {
		id: number
		name: string
		URLName: string
		imageURL: string
	}
}

export { schoolmeal }
