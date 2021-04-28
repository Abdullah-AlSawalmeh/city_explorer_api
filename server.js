"use strict";

//to run the server
//1- npm start
//2- node server.js
//3- nodemon

const express = require("express");
const superagent = require("superagent");
const cors = require("cors");
const pg = require("pg");
require("dotenv").config();

const server = express();
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false },
});
server.use(cors()); //open for any request from any client

const PORT = process.env.PORT || 5000;

//////////////////// Location
function Location(cityName, locData) {
  this.search_query = cityName;
  this.formatted_query = locData[0].display_name;
  this.latitude = locData[0].lat;
  this.longitude = locData[0].lon;
}
/////// Method 2 for lab08 >>> Method 1 is below, method 1 consume memory
function getLocation(req, res) {
  //fetch the data that inside locaion.json file
  let cityName = req.query.city;
  if (!cityName) {
    res.send(
      "Put right url like this : https://abdullah-city-explorer-api.herokuapp.com/location?city=texas"
    );
  } else {
    let SQL1 = `SELECT * FROM locations WHERE search_query=$1;`;
    client
      .query(SQL1, [cityName])
      .then((result1) => {
        if (result1.rows.length) {
          console.log("This from the Database");
          res.send(result1.rows);
        } else {
          console.log("This from the API");
          let key = process.env.GEOCODE_API_KEY;
          let locURL = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;
          superagent
            .get(locURL) //send a request locatioIQ API
            .then((geoData) => {
              let gData = geoData.body;
              let locationData = new Location(cityName, gData);
              let SQL3 = `INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;`;
              let safeValues = [
                locationData.search_query,
                locationData.formatted_query,
                locationData.latitude,
                locationData.longitude,
              ];
              client
                .query(SQL3, safeValues)
                .then((result3) => {
                  res.send(result3.rows);
                })
                .catch((error) => {
                  console.log(error);
                  res.send(error);
                });
            })
            .catch((error) => {
              console.log(error);
              res.send(error);
            });
        }
      })
      .catch((error) => {
        console.log(error);
        res.send(error);
      });
  }
}
server.get("/location", getLocation);

//////////////////// Weather
function Weather(WeaData) {
  this.forecast = WeaData.weather.description;
  this.time = new Date(WeaData.datetime).toString().slice(0, 15);
}
function getWeather(req, res) {
  //fetch the data that inside locaion.json file
  let cityName = req.query.search_query;
  let key = process.env.WEATHER_API_KEY;
  let locURL = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityName}&days=8&key=${key}`;
  superagent
    .get(locURL) //send a request locatioIQ API
    .then((WeaData) => {
      let wData = WeaData.body;
      const weatherObj = wData.data.map(function (element, i) {
        return new Weather(element);
      });
      // weatherObjSpliced = weatherObj.splice(0, 8);
      res.send(weatherObj);
    })
    .catch((error) => {
      console.log(error);
      res.send(error);
    });
}
server.get("/weather", getWeather);

//////////////////// Parks
function Park(parkData) {
  this.name = parkData.fullName;
  this.address = `${parkData.addresses[0].city} , ${parkData.addresses[0].line1} , ${parkData.addresses[0].line2}`;
  this.fee = parkData.entranceFees[0].cost;
  this.description = parkData.description;
  this.url = parkData.url;
}
function getParks(req, res) {
  //fetch the data that inside locaion.json file
  let cityName = req.query.search_query;
  // console.log(cityName);
  let key = process.env.PARKS_API_KEY;
  let locURL = `https://developer.nps.gov/api/v1/parks?q=${cityName}&api_key=${key}`;
  superagent
    .get(locURL) //send a request locatioIQ API
    .then((parkData) => {
      let pData = parkData.body;
      const parksObj = pData.data.map(function (element, i) {
        return new Park(element);
      });
      res.send(parksObj);
    })
    .catch((error) => {
      console.log(error);
      res.send(error);
    });
}
server.get("/parks", getParks);

///////////////////// Test DataBase
function addDataHandler(req, res) {
  // console.log(req.query);
  let firstName = req.query.first;
  let lastName = req.query.last;
  let SQL1 = `SELECT firstName FROM people;`;
  client.query(SQL1).then((result) => {
    // result.rows.forEach((element) => {
    //   if (element.firstname === firstName) {
    //     console.log("I`am here");
    //   }
    //   // console.log(element.firstname);
    // });
    res.send(result.rows);
  });
  // let SQL = `INSERT INTO people (firstName,lastName) VALUES ($1,$2) RETURNING *;`;
  // let safeValues = [firstName, lastName];
  // client
  //   .query(SQL, safeValues)
  //   .then((result) => {
  //     res.send(result.rows);
  //   })
  //   .catch((error) => {
  //     res.send(error);
  //   });
}
server.get("/add", addDataHandler);

///////////////////// Movies
function MVS(MVSData) {
  this.title = MVSData.title;
  this.overview = MVSData.overview;
  this.average_votes = MVSData.vote_average;
  this.total_votes = MVSData.vote_count;
  this.image_url = MVSData.poster_path;
  this.popularity = MVSData.popularity;
  this.released_on = MVSData.release_date;
}

function moviesDataHandler(req, res) {
  let cityName = req.query.search_query;
  let key = process.env.MOVIE_API_KEY;
  let locURL = `https://api.themoviedb.org/3/movie/top_rated/?region=${cityName}&api_key=${key}`;
  superagent
    .get(locURL) //send a request locatioIQ API
    .then((mvsData) => {
      let mData = mvsData.body;
      console.log(mData);
      const mvsObj = mData.results.map(function (element, i) {
        return new MVS(element);
      });
      res.send(mvsObj);
    })
    .catch((error) => {
      console.log(error);
      res.send(error);
    });
}
server.get("/movies", moviesDataHandler);

//////////////////// general
function getGeneral(req, res) {
  //fetch the data that inside locaion.json file
  let errObj = {
    status: 500,
    resText: "sorry! this page not found",
  };
  res.status(500).send(errObj);
}
server.get("*", getGeneral);

//////////////////// listening
client.connect().then(() => {
  server.listen(PORT, () => console.log(`listening on ${PORT}`));
});

/////// Method 1 for lab08
// function getLocation(req, res) {
//   //fetch the data that inside locaion.json file
//   let cityName = req.query.city;
//   if (!cityName) {
//     res.send("Put right url");
//   } else {
//     let SQL1 = `SELECT * FROM locations;`;
//     client
//       .query(SQL1)
//       .then((result1) => {
//         let allCitiesInDb = result1.rows.map((element) => {
//           return element.search_query;
//         });

//         if (allCitiesInDb.includes(cityName)) {
//           let SQL2 = `SELECT * FROM locations WHERE search_query='${cityName}';`;
//           client
//             .query(SQL2)
//             .then((result2) => {
//               res.send(result2.rows);
//             })
//             .catch((error) => {
//               console.log(error);
//               res.send(error);
//             });
//         } else {
//           let key = process.env.GEOCODE_API_KEY;
//           let locURL = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${cityName}&format=json`;
//           superagent
//             .get(locURL) //send a request locatioIQ API
//             .then((geoData) => {
//               let gData = geoData.body;
//               let locationData = new Location(cityName, gData);
//               let SQL3 = `INSERT INTO locations (search_query,formatted_query,latitude,longitude) VALUES ($1,$2,$3,$4) RETURNING *;`;
//               let safeValues = [
//                 locationData.search_query,
//                 locationData.formatted_query,
//                 locationData.latitude,
//                 locationData.longitude,
//               ];
//               client
//                 .query(SQL3, safeValues)
//                 .then((result) => {
//                   res.send(result.rows);
//                 })
//                 .catch((error) => {
//                   console.log(error);
//                   res.send(error);
//                 });
//             })
//             .catch((error) => {
//               console.log(error);
//               res.send(error);
//             });
//         }
//       })
//       .catch((error) => {
//         console.log(error);
//         res.send(error);
//       });
//   }
// }
