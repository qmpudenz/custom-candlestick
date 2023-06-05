// Include required modules
const express = require('express');  // Express.js for handling HTTP requests
const mysql = require('mysql');  // MySQL to interact with the database
const cors = require('cors');  // CORS for cross-origin resource sharing

// Initialize express app and port number
const app = express();
const port = 3003;

// Use CORS middleware
app.use(cors());

// Set up database connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'candlestick_database'
});

// Connect to the database
connection.connect((error) => {
  if (error) {
    console.error('Error connecting to MySQL:', error);
    return;
  }
  console.log('Connected to MySQL database!');
});

// Function to fetch candlestick data from the database
// Define a function 'fetchData'. This function accepts four parameters: the traderTable name, the currency to filter, a successCallback function, and an errorCallback function.
function fetchData(traderTable, currency, successCallback, errorCallback) {
  // Execute a query on the MySQL database connection. The query fetches date_candle_started, open, high, low, and close fields from the traderTable where the currency matches the given 'currency', ordered by date_candle_started in ascending order.
  connection.query(`SELECT date_candle_started, open, high, low, close FROM ${traderTable} WHERE currency = '${currency}' ORDER BY date_candle_started ASC`, function (error, results) {
    // If there is an error with the query, call the errorCallback function with the error.
    if (error) {
      errorCallback(error);
    } else {
      // If there is no error, transform the results into formattedData. Each row is mapped into a new array containing date_candle_started and numerical values of low, open, close, and high.
      const formattedData = results.map(row => {
        const { date_candle_started, low, open, close, high } = row;
        return [date_candle_started, parseFloat(low), parseFloat(open), parseFloat(close), parseFloat(high)];
      });
      // After formatting the data, call the successCallback function with the formattedData as the argument.
      successCallback(formattedData);
    }
  });
}


// Function to fetch signal data from the database
// Define a function 'fetchSignals'. This function accepts four parameters: the traderTable name, the currency to filter, a successCallback function, and an errorCallback function.
function fetchSignals(traderTable, currency, successCallback, errorCallback) {
  // Execute a query on the MySQL database connection. The query fetches all fields (*) from the NashSignals table where the currency_id matches the given 'currency', ordered by date_started in ascending order.
  connection.query(`SELECT * FROM NashSignals WHERE currency_id = '${currency}' ORDER BY date_started ASC`, function (error, results) {
    // If there is an error with the query, call the errorCallback function with the error.
    if (error) {
      errorCallback(error);
    } else {
      // If there is no error, transform the results into formattedData. Each row is mapped into a new array containing a new Date object created from date_started, a new Date object created from date_ended, signal_type, and indicatorSource.
      const formattedData = results.map(row => {
        const { date_started, date_ended, signal_type, indicator } = row;
        const indicatorSource = indicator;
        return [new Date(date_started), new Date(date_ended), signal_type, indicatorSource];
      });
      // After formatting the data, call the successCallback function with the formattedData as the argument.
      successCallback(formattedData);
    }
  });
}


// Function to fetch indicator data from the database
function fetchIndicators(successCallback, errorCallback) {
  let indicatorSignalData;
  let currencyData;
  let indicatorPeriodData;
  
  // Nested queries to fetch indicatorSignalData, currencyData and indicatorPeriodData
  connection.query("SELECT * FROM ind_signal", function (error, results) {
    if (error) {
      errorCallback(error);
    } else {
      indicatorSignalData = results.map(row => {
        const { id, ind_signal } = row;
        return { id, ind_signal };
      });

      connection.query("SELECT * FROM currency", function (error, results) {
        if (error) {
          errorCallback(error);
        } else {
          currencyData = results.map(row => {
            const { id, currency_name } = row;
            return [id, currency_name];
          });

          connection.query("SELECT * FROM ind_period", function (error, results) {
            if (error) {
              errorCallback(error);
            } else {
              indicatorPeriodData = results.map(row => {
                const { id, ind_period } = row;
                return [id, ind_period];
              });

              successCallback({ indicatorSignalData, currencyData, indicatorPeriodData });
            }
          });
        }
      });
    }
  });
}

// Export functions to be used elsewhere
module.exports = { fetchData, fetchSignals, fetchIndicators };

// Express route to handle /data requests
app.get('/data', (req, res) => {
  fetchData(data => {
    const chartData = [['Day', 'Low', 'Open', 'Close', 'High']];
    data.forEach(row => {
      const { date_candle_started, low, open, close, high } = row;
      const date = new Date(date_candle_started); // Convert to JavaScript Date object
      chartData.push([date, low, open, close, high]);
    });
    
    // Send candlestick data as JSON
    res.json({ candlestickData: chartData });
  }, error => {
    console.error(error);
    res.status(500).send('Internal Server Error');
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
