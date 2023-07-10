// Include required modules
const express = require("express"); // Express.js for handling HTTP requests
const mysql = require("mysql"); // MySQL to interact with the database
const cors = require("cors"); // CORS for cross-origin resource sharing
require("dotenv").config();

// Initialize express app and port number
const app = express();
const port = process.env.SERVER_PORT;

// Use CORS middleware for enabling Cross-Origin Requests
app.use(cors());

// Set up database connection with credentials
const pool = mysql.createPool({
  connectionLimit: 100,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Function to fetch candlestick data from the database.
// 'fetchData' function accepts a table name, a currency filter, a start and end range for the date and callback functions for handling success and error.
function fetchData(
  traderTable,
  currency,
  startRange,
  endRange,
  successCallback,
  errorCallback
) {
  // Defining the SQL query to be executed
  const query = `SELECT date_candle_started, open, high, low, close FROM ${traderTable} WHERE currency = ? AND date_candle_started BETWEEN ? AND ? ORDER BY date_candle_started ASC`;
  const values = [currency, startRange, endRange];

  pool.getConnection((err, connection) => {
    if (err) {
      errorCallback(err);
      return;
    }

    // Executing the SQL query
    connection.query(query, values, function (error, results) {
      connection.release();
      if (error) {
        errorCallback(error); // If there's an error, call the errorCallback
      } else {
        // If there's no error, map through the results to format the data
        const formattedData = results.map((row) => {
          const { date_candle_started, low, open, close, high } = row;
          return [
            date_candle_started,
            parseFloat(low),
            parseFloat(open),
            parseFloat(close),
            parseFloat(high),
          ];
        });
        // After formatting the data, call the successCallback function with the formattedData as the argument.
        successCallback(formattedData);
      }
    });
  });
}

// Function to fetch line data from the database.
// 'fetchSignals function accepts a table name, a currency filter, a start and end range for the date and callback functions for handling success and error.
function fetchSignals(
  traderTable,
  currency,
  startRange,
  endRange,
  successCallback,
  errorCallback
) {
  // Defining the SQL query to be executed
  const query = `SELECT NashSignals.*, ind_signal.ind_signal FROM NashSignals JOIN ind_signal ON NashSignals.signal_type = ind_signal.id WHERE currency_id = ? AND date_started BETWEEN ? AND ? ORDER BY date_started ASC`;
  const values = [currency, startRange, endRange];

  // Executing the SQL query
  pool.getConnection((err, connection) => {
    if (err) {
      errorCallback(err);
      return;
    }
    connection.query(query, values, function (error, results) {
      connection.release(); // always release the connection after you're done
      if (error) {
        errorCallback(error); // If there's an error, call the errorCallback
      } else {
        // If there's no error, map through the results to format the data
        const formattedData = results.map((row) => {
          const { date_started, date_ended, indicator, ind_signal } = row;
          const indicatorSource = ind_signal;
          const signal_type = indicator;
          return [
            new Date(date_started),
            new Date(date_ended),
            signal_type,
            indicatorSource,
          ];
        });
        // After formatting the data, call the successCallback function with the formattedData as the argument.
        successCallback(formattedData);
      }
    });
  });
}

// Function to fetch indicator data from the database
function fetchIndicators(successCallback, errorCallback) {
  // These variables will store the results of the database queries
  let indicatorSignalData;
  let currencyData;
  let indicatorPeriodData;

  // Get a new connection from the pool
  pool.getConnection((err, connection) => {
    if (err) {
      errorCallback(err);
    } else {
      // The first query fetches data from the 'ind_signal' table.
      connection.query("SELECT * FROM ind_signal", function (error, results) {
        if (error) {
          // If there's an error, call the errorCallback
          connection.release();
          errorCallback(error);
        } else {
          // If there's no error, map through the results to create the 'indicatorSignalData' array
          indicatorSignalData = results.map((row) => {
            const { id, ind_signal } = row;
            return { id, ind_signal };
          });

          // The second query fetches data from the 'currency' table. This query is nested within the first query's callback to ensure the queries are run in sequence.
          connection.query("SELECT * FROM currency", function (error, results) {
            if (error) {
              // If there's an error, call the errorCallback
              connection.release();
              errorCallback(error);
            } else {
              // If there's no error, map through the results to create the 'currencyData' array
              currencyData = results.map((row) => {
                const { id, currency_name } = row;
                return [id, currency_name];
              });

              // The third query fetches data from the 'ind_period' table. This query is nested within the second query's callback to ensure the queries are run in sequence.
              connection.query(
                "SELECT * FROM ind_period",
                function (error, results) {
                  if (error) {
                    // If there's an error, call the errorCallback
                    connection.release();
                    errorCallback(error);
                  } else {
                    // If there's no error, map through the results to create the 'indicatorPeriodData' array
                    indicatorPeriodData = results.map((row) => {
                      const { id, ind_period } = row;
                      return [id, ind_period];
                    });

                    // After all data has been fetched and formatted, call the successCallback function with the 'indicatorSignalData', 'currencyData', and 'indicatorPeriodData' as the arguments.
                    connection.release();
                    successCallback({
                      indicatorSignalData,
                      currencyData,
                      indicatorPeriodData,
                    });
                  }
                }
              );
            }
          });
        }
      });
    }
  });
}

// Export functions to be used elsewhere
module.exports = { fetchData, fetchSignals, fetchIndicators };

// Defining an Express route to handle /data requests
app.get("/data", (req, res) => {
  fetchData(
    (data) => {
      // Preparing the data to be sent in the response
      const chartData = [["Day", "Low", "Open", "Close", "High"]];
      data.forEach((row) => {
        const { date_candle_started, low, open, close, high } = row;
        const date = new Date(date_candle_started); // Convert to JavaScript Date object
        chartData.push([date, low, open, close, high]);
      });

      // Sending the response with the candlestick data in JSON format
      res.json({ candlestickData: chartData });
    },
    (error) => {
      console.error(error);
      // In case of error, send a 500 Internal Server Error response
      res.status(500).send("Internal Server Error");
    }
  );
});

// Starting the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Logging a message to indicate the server is running
});
