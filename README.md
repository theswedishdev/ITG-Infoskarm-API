# ITG-Infoskarm API
[![NSP Status](https://nodesecurity.io/orgs/itg-infoskarm/projects/03784c89-6ecb-460d-9aa0-14b3e631ccc8/badge)](https://nodesecurity.io/orgs/itg-infoskarm/projects/03784c89-6ecb-460d-9aa0-14b3e631ccc8)

This project is a working WIP. It does not have all planned features.

# API

## vasttrafik.BaseAPIRequester
The `BaseAPIRequester` is not supposed to be used for anything except as a template for an HTTP request class.

### Usage

This class is not for use as all methods included will throw an error. The `BaseAPIRequester` should only be used to extend another class that implements the `HTTPThrottler.HTTPThrottled` interface.
```javascript
class FooAPIRequester extends BaseAPIRequester {
	constructor() {
		super()
	}

	public requestIsAllowed() {
		return true
	}

	public performRequest(options) {
		return request(options).promise()
	}
}
```

## vasttrafik.APIRequester
The `APIRequester` is an implementation of `HTTPThrottler.HTTPThrottled` that extends `BaseAPIRequester` with a token bucket.

### Usage 

#### Create an instance
This example will create an instance of `APIRequster` allowing 10 requests per minute.
```javascript
const vasttrafikAPIRequester = new vasttrafik.APIRequester(10, 60000)
```

### Methods

__performRequest__

Perform a request using [`request-promise-native`](https://www.npmjs.com/package/request-promise-native).
```javascript
apiRequester.performRequest({
	url: "https://httpbin.org/get",
	method: "GET"
}).then((data) => {
	// Consume data
}).catch((error) => {
	// Handle errors
})
```

__requestIsAllowed__

Check if a HTTP request is allowed or not.
```javascript
if (apiRequester.requestIsAllowed()) {
	// Perform a request
} else {
	// Do not perform a request
}
```

__refillTokens__

Refill tokens to the token bucket to make sure there are token left to make HTTP requests. This is typically not necessary as this method is called with `requestIsAllowed`. The token bucket will refill if the time when the token bucket was refilled plus the amount of milliseconds passed to the constructor has passed.
```javascript
apiRequester.refillTokens()
```

## vasttrafik.API
The `API` is used to perform HTTP requests to Västtrafik's API.

### Usage

#### Create an instance
```javascript
const vasttrafikAPI = new vasttrafik.API("<västtrafik API access token>", vasttrafikAPIRequester)
```

### Methods

__getDepartures__

Get JSON from Västtrafik's journey planner API version v2 for the `/departureBoard` endpoint. Returns the parsed response as an object according to the type `vasttrafik.Stop`.
```javascript
vasttrafikAPI.getDepartures("9022014001960001", new Date(), 60, false).then((stop) => {
	// Consume stop
}).catch((error) => {
	// Handle errors
})
```

## Todo
- Add methods to vasttrafik.API for endpoints in Västtrafik's journey planner API version v2
- Write documentation on how to get started using ITG-Infoskarm-API
	- Dependencies
		- Node version
		- Firebase
		- And more
- Contribution guidelines

## License
MIT License

Copyright &copy; 2017-2018 Joel Ericsson <joel.eriksson@protonmail.com>
