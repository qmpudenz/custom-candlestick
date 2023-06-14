# Currency Candlestick Chart Application

This application is a simple chart display of currency candlestick data, fetched from a server. The user (in the browser) sends requests to the server, the server fetches the data from a database, and then sends it back to the user.

The application is divided into three main files:

## index.html

This is the front-end of the application, written in HTML and JavaScript. It provides the user interface, which consists of a dropdown to select the desired currency and time interval, and a button to fetch the data.

When the user clicks on the fetch button, the application sends a request to the server to get the corresponding data. Once the data is received, it is processed and displayed in a candlestick chart using ECharts.

The chart shows the open, close, low, and high values of the selected currency during the selected time interval. There is also an error message that appears if there is no data available for the chosen parameters.

## server.js

This is the back-end of the application, written in Node.js. It sets up a server that listens for HTTP requests on a certain port.

The server supports requests to fetch the candlestick data for a particular currency and time interval, as well as the list of available currencies. The data is fetched from a database (the specifics of which depend on your setup) and sent back to user in JSON format.

## app.js

This file is responsible for initiating the server. It imports the server module from server.js and calls the function to start the server.

# Running the Application

To run the application, first start the server by running app.js with Node.js:

'node app.js'

Then open index.html in your web browser.

You can select a currency and time interval from the dropdown menus, and click the fetch button to get and display the data.

# Troubleshooting

If you have any issues with the application, please check the JavaScript console in your browser for any errors. You can also check the output of the Node.js server.
