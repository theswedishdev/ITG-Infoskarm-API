/**
 * Main file for the Skolmaten API wrapper
 * @since 0.1.0
 * @module schoolmeal
 * @author Joel Eriksson <joel.eriksson@protonmail.com>
 * @copyright 2017 Joel Eriksson <joel.eriksson@protonmail.com>
 * @license MIT
 */

import * as slug from "slug"
import * as console from "better-console"
import * as moment from "moment-timezone"
import * as admin from "firebase-admin"
import * as contentType from "content-type"
import * as request from "request-promise-native"

import { HTTPThrottler } from "../httpthrottler/httpthrottler"
import { schoolmeal as schoolmealTypes } from "./types"

/**
 * @since 0.1.0
 * @namespace schoolmeal
 */
namespace schoolmeal {
	export class API {
		private _attributes: object = {}

		/**
		 * Base URL for Skolmaten's API
		 * @readonly
		 * @public
		 */
		public baseURL: string = "https://skolmaten.se/api/3"

		/**
		 * @since 0.1.0
		 * @param {HTTPThrottler.HTTPThrottled} apiRequester - An instance of a class implementing the [[HTTPThrottler.HTTPThrottled]] interface
		 * @param {admin.Database.Reference} _schoolmealRef - A Firebase database reference to a parent containing "attributes" in an array of objects.
		 * @param {string} _client - The client (API key) to use for requests to Skolmaten's API.
		 * @param {string} _versionToken - The version token to use for requests to Skolmaten's API. The version token will set which version of the API to be used.
		 */
		constructor(public apiRequester: HTTPThrottler.HTTPThrottled, private _schoolmealRef: admin.database.Reference, private _client: string, private _versionToken?: string) {
			if (this._versionToken) {
				_schoolmealRef.child("attributes").on("child_added", (snap) => {
					this._attributes[snap.key] = snap.val()
				})

				_schoolmealRef.child("attributes").on("child_changed", (snap) => {
					this._attributes[snap.key] = snap.val()
				})

				_schoolmealRef.child("attributes").on("child_removed", (snap) => {
					delete this._attributes[snap.key]
				})
			}

			moment.tz.setDefault("GMT")
		}

		private _getMenu(school: string, week: string, year: string, lastModified: number, resolve: Function, reject: Function) {
			this.apiRequester.performRequest({
				url : `${this.baseURL}/menu`,
				method: "GET",
				headers: {
					"If-Modified-Since": moment(lastModified).tz("GMT").format("ddd, DD MMM YYYY HH:mm:ss z")
				},
				qs: {
					client: this._client,
					clientVersion: this._versionToken ? this._versionToken : undefined,
					school: school,
					week: week,
					year: year,
				},
				transform: (body, response, resolveWithFullResponse) => {						
					if (response.statusCode === 304) {
						return body
					}

					if (contentType.parse(response.headers["content-type"]).type === "application/json") {
						let result = JSON.parse(body)

						if (response.headers.hasOwnProperty("last-modified")) {
							result.lastModified = moment(response.headers["last-modified"], "ddd, DD MMM YYYY HH:mm:ss z").tz("GMT")
						}

						return JSON.stringify(result)
					} else {
						throw new Error("Invalid content-type")
					}
				}
			}).then((data) => {
				const apiData: schoolmealTypes.RawAPI.API = JSON.parse(data)

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
					lastmodified: new Date(apiData.lastModified).getTime(),
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
								attributes: []
							}

							if (meal.hasOwnProperty("attributes")) {
								meal.attributes.forEach((attribute: number, k: number) => {
									if (this._attributes.hasOwnProperty(attribute)) {
										thisMeal.attributes.push({
											id: attribute,
											data: this._attributes[attribute],
										} as schoolmealTypes.Menu.Attribute)
									} else {
										thisMeal.attributes.push({
											id: attribute,
										} as schoolmealTypes.Menu.Attribute)
									}
								})
							} else {
								delete thisMeal.attributes
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
		 */
		public getMenu(school: string, force: boolean, week: string = moment().tz("GMT").format("W"), year: string = moment().tz("GMT").format("YYYY")): Promise<schoolmealTypes.Menu.WeekMenu> {			
			return new Promise((resolve, reject) => {
				let menuResponse

				let lastModified: number = 0

				this._schoolmealRef.child("schools").child(school).child(year).child(week).child("lastmodified").once("value", (snap) => {
					if (typeof snap.val() === "number" && !force) {
						lastModified = snap.val()
					}

					this._getMenu(school, week, year, lastModified, resolve, reject)
				}, (error) => {
					this._getMenu(school, week, year, lastModified, resolve, reject)
				})
			})
		}
	}
}

export default schoolmeal
