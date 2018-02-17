/**
 * Main file for the Skolmaten API wrapper
 * @since 0.1.0
 * @module schoolmeal
 * @author Joel Ericsson <joel.eriksson@protonmail.com>
 * @copyright 2017-2018 Joel Ericsson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as moment from "moment-timezone"

import { HTTPThrottler } from "../httpthrottler/httpthrottler"
import { schoolmeal as schoolmealTypes } from "./types"

/**
 * @since 0.1.0
 * @namespace schoolmeal
 */
namespace schoolmeal {
	export class API {
		/**
		 * Base URL for Skolmaten's API
		 * @readonly
		 * @public
		 */
		public baseURL: string = "https://skolmaten.se/api/3"

		/**
		 * The Last-Modified time of the latest API response
		 * @private
		 */
		private _lastModified: number = 0

		/**
		 * @since 0.1.0
		 * @param {HTTPThrottler.HTTPThrottled} apiRequester - An instance of a class implementing the [[HTTPThrottler.HTTPThrottled]] interface
		 * @param {string} _client - The client (API key) to use for requests to Skolmaten's API.
		 * @param {string} [_versionToken] - The version token to use for requests to Skolmaten's API. The version token will set which version of the API to be used.
		 */
		constructor(public apiRequester: HTTPThrottler.HTTPThrottled, private _client: string, private _versionToken?: string) {
			moment.tz.setDefault("GMT")
		}


		protected get lastModified() {
			return this._lastModified
		}

		protected set lastModified(value) {
			if (this._lastModified < value) {
				this._lastModified = value
			}
		}

		protected _getMenu(school: string, force: boolean, week: string, year: string, lastModified: number, resolve: Function, reject: Function) {
			this.apiRequester.performRequest({
				method: "GET",
				url : `${this.baseURL}/menu`,
				responseType: "json",
				headers: {
					"If-Modified-Since": moment(lastModified, "x").tz("GMT").format("ddd, DD MMM YYYY HH:mm:ss z")
				},
				params: {
					client: this._client,
					clientVersion: this._versionToken ? this._versionToken : undefined,
					school: school,
					week: week,
					year: year,
				},
			}).then((response) => {
				const apiData: schoolmealTypes.RawAPI.API = response.data

				let lastModified = 0
				if (response.headers.hasOwnProperty("last-modified")) {
					this.lastModified = parseInt(moment(response.headers["last-modified"], "ddd, DD MMM YYYY HH:mm:ss z").tz("GMT").format('x'))
				}

				const school: schoolmealTypes.School = {
					id: apiData.school.id,
					name: apiData.school.name,
					URLName: apiData.school.URLName,
					imageURL: apiData.school.imageURL,
				}

				let result: schoolmealTypes.Menu.WeekMenu = {
					year: parseInt(year),
					week: parseInt(week),
					school: school,
					days: {},
					lastModified: this.lastModified,
				}

				apiData.weeks[0].days.forEach((day: schoolmealTypes.RawAPI.Day, i: number) => {
					const dayString = moment.tz(`${day.date}`, "X", "GMT").format("dddd").toLowerCase()

					const menu: schoolmealTypes.Menu.Menu = result.days[dayString] = {
						date: day.date,
						open: true,
						meals: [],
					}

					if (day.hasOwnProperty("reason")) {
						menu.open = false
						menu.reason = day.reason
						delete menu.meals
					} else if (day.hasOwnProperty("meals")) {
						day.meals.forEach((meal: schoolmealTypes.RawAPI.Meal, j: number) => {
							let thisMeal: schoolmealTypes.Menu.Meal = {
								value: meal.value,
								attributes: meal.attributes.map((attribute) => {
									return {
										id: attribute
									}
								}),
							}

							menu.meals.push(thisMeal)
						})
					}
				})

				if (apiData.hasOwnProperty("bulletins")) {
					result.bulletins = apiData.bulletins
				}

				return resolve(result)
			}).catch((error) => {
				return reject(error)
			})
		}

		/**
		 * Get menu for a school from Skolmaten's API
		 * @param {string} school - The school from which to get the menu.
		 * @param {boolean} force - Wheater or not to use 'If-Modified-Since' HTTP header
		 * @param {string} week - Week of the year to get the menu for.
		 * @param {string} year - Year to get the menu for.
		 * @return {Promise<schoolmealTypes.Menu.WeekMenu>}
		 */
		public getMenu(school: string, force: boolean = false, week: string = moment().tz("GMT").format("W"), year: string = moment().tz("GMT").format("YYYY")): Promise<schoolmealTypes.Menu.WeekMenu> {			
			return new Promise((resolve, reject) => {
				let lastModified: number = 0
				
				if (!force) {
					lastModified = this.lastModified
				}

				this._getMenu(school, force, week, year, lastModified, resolve, reject)
			})
		}
	}
}

export default schoolmeal
