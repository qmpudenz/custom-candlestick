// Declare and initialize global variables
const { DateTime } = luxon;
let chartData;
let signalData;

// Define a function to find the closest date in the candlestick data to a given date
function findCandlestickForDate(targetDate, candlestickData) {
  let closestCandlestick = candlestickData[0];
  let closestTimeDifference = Math.abs(
    new Date(closestCandlestick.date) - targetDate
  );

  candlestickData.forEach((candlestick) => {
    let currentCandlestickDate = new Date(candlestick.date);
    let currentTimeDifference = Math.abs(currentCandlestickDate - targetDate);

    if (currentTimeDifference < closestTimeDifference) {
      closestCandlestick = candlestick;
      closestTimeDifference = currentTimeDifference;
    }
  });

  return closestCandlestick;
}

// This asynchronous function is used to fetch data from an API and draw a chart based on that data.
// The function is fetching data for a specific trading table and currency, which are provided as input parameters.
async function fetchDataAndDrawChart(traderTable, currency) {
  // Initially, a loading message is displayed on the chart.
  myChart.showLoading({
    text: "Loading...",
    textColor: "#000",
    maskColor: "rgba(255, 255, 255, 0.8)",
    zlevel: 0,
  });

  // The function retrieves start and end date/time from user inputs.
  let startDate = document.getElementById("startDateInput").value;
  let startTime = document.getElementById("startTimeInput").value;
  let endDate = document.getElementById("endDateInput").value;
  let endTime = document.getElementById("endTimeInput").value;

  let startRange = `${startDate} ${startTime}`;
  let endRange = `${endDate} ${endTime}`;

  try {
    // It fetches data from two separate endpoints.
    // One for fetching candlestick data and another one for fetching signals data.

    let data;
    const response = await fetch(
      `${config.API_HOST}:${config.API_PORT}/data/${traderTable}/${currency}/${startRange}/${endRange}`
    );
    data = await response.json();
    const signalResponse = await fetch(
      `${config.API_HOST}:${config.API_PORT}/nashsignals/${traderTable}/${currency}/${startRange}/${endRange}`
    );
    signalData = await signalResponse.json();

    // If there is no signal data, a message is displayed to inform the user.
    // Otherwise, the message is hidden.
    if (signalData.length === 0) {
      // If there is no line data, show the message
      document.getElementById("noDataMessage").style.display = "block";
    } else {
      // If there is line data, hide the message
      document.getElementById("noDataMessage").style.display = "none";
    }

    // The fetched candlestick data is converted to the format required by the chart.
    chartData = data.map((row) => {
      const date_candle_started = row[0];
      const low = row[1];
      const open = row[2];
      const close = row[3];
      const high = row[4];
      return {
        date: date_candle_started,
        values: [open, close, low, high],
      };
    });

    // A separate data structure for the chart's mark line data is created based on the signals data.
    // It uses helper functions to find the matching candlestick for each signal's start and end dates.
    let markLineData = signalData.map((signal) => {
      const [startRange, endRange, indicatorSource, signalType] = signal;

      // Find the matching candlesticks for the start and end dates
      const startCandlestick = findCandlestickForDate(
        new Date(startRange),
        chartData
      );
      const endCandlestick = findCandlestickForDate(
        new Date(endRange),
        chartData
      );

      // Find the index of the start and end candlesticks
      const startIndex = chartData.findIndex(
        (candlestick) => candlestick.date === startCandlestick.date
      );
      const endIndex = chartData.findIndex(
        (candlestick) => candlestick.date === endCandlestick.date
      );
      let lineColor;
      switch (signalType) {
        case "BUY":
        case "BUY SOON":
          lineColor = "rgb(0, 179, 0)";
          break;
        case "SELL":
        case "SELL SOON":
          lineColor = "red";
          break;
        default:
          lineColor = "blue";
          break;
      }
      return [
        {
          name: indicatorSource,
          signalType: signalType,
          symbol: "circle",
          symbolSize: 7,
          coord: [startIndex, startCandlestick.values[1]],
          label: {
            formatter: "",
            position: "start",
          },
          lineStyle: {
            color: lineColor,
          },
          tooltip: {
            formatter: function () {
              const startFormattedDate = DateTime.fromISO(startRange)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              const endFormattedDate = DateTime.fromISO(endRange)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              return (
                "Signal Source: " +
                indicatorSource +
                "<br />" +
                signalType +
                ": " +
                startFormattedDate +
                " to " +
                endFormattedDate
              );
            },
          },
        },
        {
          name: "end",
          coord: [endIndex, endCandlestick.values[1]],
          symbol: "circle",
          symbolSize: 7,
          tooltip: {
            formatter: function () {
              const endFormattedDate = DateTime.fromISO(endDate)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              return "End: " + endFormattedDate;
            },
          },
        },
      ];
    });

    // After fetching and preparing the data, the loading message is hidden.
    myChart.hideLoading();

    // The function retrieves user's selections for filters and sources from the UI.
    // The selections are used later to filter the mark line data.
    let selectedFilters = Array.from(
      document
        .getElementById("indicatorFilter-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    let selectedSources = Array.from(
      document
        .getElementById("indicator-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    // If 'all' is selected in either filters or sources, the corresponding selection is cleared.
    // Check if 'all' is selected in the filters
    if (selectedFilters.includes("all")) {
      // If 'all' is selected, clear the selectedFilters
      selectedFilters = [];
    }

    // Check if 'all' is selected in the sources
    if (selectedSources.includes("all")) {
      // If 'all' is selected, clear the selectedSources
      selectedSources = [];
    }

    // The mark line data is filtered based on user's selections for filters and sources.
    let markLineDataFiltered = markLineData;

    // Filter by source only if a specific source is selected
    if (selectedSources.length > 0) {
      markLineDataFiltered = markLineDataFiltered.filter((data) =>
        selectedSources.includes(data[0].name)
      );
    }

    // Filter by filters only if specific filters are selected
    if (selectedFilters.length > 0) {
      markLineDataFiltered = markLineDataFiltered.filter((data) =>
        selectedFilters.includes(data[0].signalType)
      );
    }

    // Function to get the ordinal suffix of a number, for console message
    function getOrdinalSuffix(n) {
      let s = ["th", "st", "nd", "rd"],
        v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Accessing the values from the dropdown menu
    let traderTableVal = document.getElementById("traderTable").value;
    // Fetch start and end date from date inputs
    let startDateVal = new Date(
      document.getElementById("startDateInput").value
    );
    startDateVal.setMinutes(
      startDateVal.getMinutes() + startDateVal.getTimezoneOffset()
    );

    let endDateVal = new Date(document.getElementById("endDateInput").value);
    endDateVal.setMinutes(
      endDateVal.getMinutes() + endDateVal.getTimezoneOffset()
    );

    let startTimeVal = document.getElementById("startTimeInput").value;
    let endTimeVal = document.getElementById("endTimeInput").value;

    // Format the start and end dates
    let dateOptions = { month: "short", day: "numeric", year: "numeric" };

    let startDateStr = startDateVal.toLocaleDateString("en-US", dateOptions);
    let endDateStr = endDateVal.toLocaleDateString("en-US", dateOptions);

    let startTimeStr = startTimeVal;
    let endTimeStr = endTimeVal;

    // Adding ordinal suffixes to the day part of the dates
    startDateStr = startDateStr.replace(/\d+/, function (match) {
      return getOrdinalSuffix(match);
    });
    endDateStr = endDateStr.replace(/\d+/, function (match) {
      return getOrdinalSuffix(match);
    });

    // Determine whether the trader table supports time
    let traderTableSupportsTime =
      traderTableVal === "trader_D" ||
      traderTableVal.startsWith("trader_M1") ||
      traderTableVal.startsWith("trader_M5") ||
      traderTableVal.startsWith("trader_H");

    // Concatenate date and time parts based on whether the trader table supports time
    let startRangeStr = traderTableSupportsTime
      ? `${startDateStr}, ${startTimeStr}`
      : startDateStr;
    let endRangeStr = traderTableSupportsTime
      ? `${endDateStr}, ${endTimeStr}`
      : endDateStr;

    // Check if start and end dates are the same. If they are, display the date only once
    if (startDateStr === endDateStr && traderTableSupportsTime) {
      endRangeStr = endTimeStr;
    }
    // Accessing the values from the checkbox group for selected filters
    let selectedFiltersVal = Array.from(
      document
        .getElementById("indicatorFilter-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    // Check how many selected filters we have and adjust the sentence accordingly
    let filterStatement =
      selectedFiltersVal.length === 0 || selectedFiltersVal[0] === "all"
        ? ""
        : selectedFiltersVal.length === 1
        ? `The selected filter is <b>${selectedFiltersVal[0]}</b>.`
        : `The selected filters are <b>${selectedFiltersVal
            .slice(0, -1)
            .join(", ")}</b>, and <b>${selectedFiltersVal.slice(-1)}</b>.`;

    // Accessing the values from the checkbox group for selected sources
    let selectedSourcesVal = Array.from(
      document
        .getElementById("indicator-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    // Check how many selected sources we have and adjust the sentence accordingly
    let sourceStatement =
      selectedSourcesVal.length === 0 || selectedSourcesVal[0] === "all"
        ? ""
        : selectedSourcesVal.length === 1
        ? `The selected source is <b>${selectedSourcesVal[0]}</b>.`
        : `The selected sources are <b>${selectedSourcesVal
            .slice(0, -1)
            .join(", ")}</b>, and <b>${selectedSourcesVal.slice(-1)}</b>.`;

    // The function prepares a message for the console that summarizes the current data display.
    // It retrieves the current selections from the UI, formats them, and concatenates them into a single message.
    let message = `Currently displaying data for <b>${currencyIdToStringMap[currency]}</b> in the <b>${traderTableVal}</b> table, from <b>${startRangeStr}</b> to <b>${endRangeStr}</b>. ${sourceStatement} ${filterStatement}`;

    // The prepared message is displayed in the console.
    let consoleDiv = document.getElementById("console");
    consoleDiv.innerHTML = message;

    // Finally, the function calls another function to draw the chart using the prepared and filtered mark line data.
    drawChart(markLineDataFiltered);
  } catch (error) {
    // If an error occurs during the data fetching or preparation, it is logged to the console
    // and the loading message is hidden.
    console.error("Error fetching data:", error);
    myChart.hideLoading();
  }
}

// Initialize the chart
var myChart = echarts.init(document.getElementById("main"));

// Allows for resizing of the chart
window.addEventListener("resize", function () {
  myChart.resize();
});

// The 'drawChart' function is used to visualize the fetched candlestick data and signal lines on a chart.
// It receives one parameter 'markLineDataFiltered' which contains the data to be used for drawing signal lines on the chart.
function drawChart(markLineDataFiltered) {
  // These two variables are used to track the last day and year in order to format x-axis labels correctly.
  let lastDay = null;
  let lastYear = null;

  // Define the configuration object for the chart
  const option = {
    // The 'tooltip' property defines the behavior of the tooltip that shows when the user hovers over a data point.
    // Here we set it to display a cross and provide a custom formatter function that includes date and price information.
    tooltip: {
      trigger: "item",
      axisPointer: {
        type: "cross",
      },
      formatter: function (params) {
        var date = DateTime.fromISO(chartData[params.dataIndex].date).setZone(
          "America/Chicago"
        );
        var formattedDate = date.toFormat("M-dd-yy H:mm");
        return (
          formattedDate +
          "<br/>" +
          "Open: " +
          params.value[1] +
          "<br/>" +
          "Close: " +
          params.value[2] +
          "<br/>" +
          "Lowest: " +
          params.value[3] +
          "<br/>" +
          "Highest: " +
          params.value[4]
        );
      },
    },
    // The 'dataZoom' property allows the chart to be zoomed. Here it is set to display the last 10% of the data by default.
    dataZoom: [
      {
        type: "inside",
        start: 90, // Display last 10% of data
        end: 100,
      },
    ],
    // The 'xAxis' property defines the behavior of the x-axis.
    // Here we are setting the type to 'category' and mapping the data to the correct format and timezone.
    // We also define a custom formatter for the labels, which changes based on whether the label is for a new day or year.
    xAxis: {
      type: "category",
      data: chartData.map((candlestick) => {
        return DateTime.fromISO(candlestick.date)
          .setZone("America/Chicago")
          .toFormat("M-dd-yy H:mm");
      }),
      axisLabel: {
        formatter: function (value) {
          const date = DateTime.fromFormat(value, "M-dd-yy H:mm").setZone(
            "America/Chicago"
          );
          let result = "";

          if (lastYear !== date.year) {
            lastYear = date.year;
            result += "{bold|" + date.toFormat("yyyy") + "}\n";
            lastDay = null; // Reset the day whenever the year changes
          } else if (lastDay !== date.day) {
            lastDay = date.day;
            result += "{bold|" + date.toFormat("MMM dd") + "}\n";
          } else {
            result += date.toFormat("H:mm");
          }

          return result;
        },
        rich: {
          bold: {
            fontWeight: "bold",
          },
        },
      },
    },
    // The 'yAxis' property is set to scale, which means it will adjust its scale based on the data.
    yAxis: {
      scale: true,
    },
    // The 'series' property defines the data series to be displayed on the chart.
    // Here we are setting it to display our candlestick data and mark lines.
    series: [
      {
        type: "candlestick",
        data: chartData.map((candlestick) => candlestick.values),
        itemStyle: {
          color: "black",
          color0: "white",
          borderColor: "#white",
          borderColor0: "black",
        },

        markLine: {
          showSymbol: true,
          symbol: "circle", // specify the shape of symbol, optional
          symbolSize: 8, // increase the symbol size
          connectNulls: true,
          data: markLineDataFiltered,
          lineStyle: {
            width: 4, // you may want to increase line width as well
            color: "#0000FF",
            type: "solid",
          },
        },
      },
    ],
  };

  // Finally, the 'setOption' method is called on 'myChart' to apply the configuration and draw the chart.
  myChart.setOption(option);
}

// Function to fetch the list of available currency pairs
async function fetchIndicators(successCallback, errorCallback) {
  try {
    const response = await fetch(
      `${config.API_HOST}:${config.API_PORT}/currency`
    );

    const data = await response.json();
    successCallback(data);
  } catch (error) {
    errorCallback(error);
  }
}

// Initialize selectedSources with 'all' selected
let selectedSources = ["all"];
// Initialize selectedFilters with 'all' selected
let selectedFilters = ["all"];

// populateIndicatorCheckboxGroup function populates the 'indicator-checkbox-group' with checkboxes
// for unique signal sources. It fetches data from a given URL using provided parameters,
// then it extracts unique signal sources and creates checkboxes for each source. If there are
// no unique sources, it shows a "No data available" message.
async function populateIndicatorCheckboxGroup(
  traderTable,
  currency,
  startRange,
  endRange
) {
  // Fetches signal data from the given endpoint with specified parameters.
  const signalResponse = await fetch(
    `${config.API_HOST}:${config.API_PORT}/nashsignals/${traderTable}/${currency}/${startRange}/${endRange}`
  );
  const signalData = await signalResponse.json();

  // Creates a set of unique signal sources from the fetched data, then converts it to an array.
  const uniqueSignalSources = [...new Set(signalData.map((item) => item[2]))];

  const checkboxGroup = document.getElementById("indicator-checkbox-group");
  checkboxGroup.innerHTML = "";

  // If the 'noData' class is present, it removes it.
  if (checkboxGroup.classList.contains("noData")) {
    checkboxGroup.classList.remove("noData");
  }

  // If there are no unique signal sources, display a "No data available" message and add a 'noData' class.
  if (uniqueSignalSources.length === 0) {
    checkboxGroup.className = "noData";
    checkboxGroup.innerHTML = "No indicators available";
    return; // Exit the function since there's nothing else to do
  }

  // Creates and adds an 'All' checkbox to the group that is checked by default.
  let allOption = document.createElement("input");
  allOption.type = "checkbox";
  allOption.id = "all";
  allOption.name = "all"; // Add name to the checkbox
  allOption.value = "all"; // Add value to the checkbox
  allOption.checked = true; // Set as checked by default

  // Set the properties of the checkbox...
  let allOptionLabel = document.createElement("label");
  allOptionLabel.htmlFor = "all";
  allOptionLabel.appendChild(document.createTextNode("All"));

  checkboxGroup.appendChild(allOption);
  checkboxGroup.appendChild(allOptionLabel);
  checkboxGroup.appendChild(document.createElement("br")); // Added line break here

  // For each unique signal source, creates a checkbox and corresponding label, then adds them to the checkbox group.
  uniqueSignalSources.forEach((source) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = source;
    checkbox.value = source;
    checkbox.id = `indicator-checkbox-${source}`;

    // Set the properties of the checkbox...
    const label = document.createElement("label");
    label.htmlFor = `indicator-checkbox-${source}`;
    label.appendChild(document.createTextNode(source));

    checkboxGroup.appendChild(checkbox);
    checkboxGroup.appendChild(label);
    checkboxGroup.appendChild(document.createElement("br"));
  });

  // Adds an event listener to the checkbox group that triggers when any checkbox is checked or unchecked.
  // This updates the selected sources, modifies 'All' checkbox behavior, and populates the indicator filter checkbox group.
  document
    .getElementById("indicator-checkbox-group")
    .addEventListener("change", async (event) => {
      // Get the checkboxes...
      const checkboxes = document
        .getElementById("indicator-checkbox-group")
        .getElementsByTagName("input");

      // Filter out 'all' checkbox if any other checkbox is selected...
      let selectedSources = Array.from(checkboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
      if (selectedSources.includes("all") && selectedSources.length > 1) {
        selectedSources = selectedSources.filter((source) => source !== "all");
        // Uncheck 'all'
        document.getElementById("all").checked = false;
      } else if (selectedSources.length === 0) {
        // Check 'all' checkbox if no other checkbox is selected...
        document.getElementById("all").checked = true;
        selectedSources = ["all"];
      }

      // Get start and end dates and times...
      let startDate = document.getElementById("startDateInput").value;
      let startTime = document.getElementById("startTimeInput").value;
      let endDate = document.getElementById("endDateInput").value;
      let endTime = document.getElementById("endTimeInput").value;

      // Form start and end range strings...
      let startRange = `${startDate} ${startTime}`;
      let endRange = `${endDate} ${endTime}`;

      // Populate indicator filter checkbox group with the selected sources.
      populateIndicatorFilterCheckboxGroup(
        traderTable,
        currency,
        startRange,
        endRange,
        selectedSources
      );
    });
}

// The function 'populateIndicatorFilterCheckboxGroup' populates the 'indicatorFilter-checkbox-group' with checkboxes for unique indicators.
// It fetches signal data from a given endpoint using provided parameters. Based on the selected sources, it filters the signal data and
// extracts unique indicators to create checkboxes for each. If no unique indicators are found, it shows a "No data available" message.
async function populateIndicatorFilterCheckboxGroup(
  traderTable,
  currency,
  startRange,
  endRange,
  sources
) {
  // Fetches signal data from the specified endpoint.
  const signalResponse = await fetch(
    `${config.API_HOST}:${config.API_PORT}/nashsignals/${traderTable}/${currency}/${startRange}/${endRange}`
  );
  const signalData = await signalResponse.json();

  // Filters the fetched signal data based on the selected sources unless 'all' is selected, in which case it uses the entire signal data.
  let filteredSignalData = signalData;
  if (sources && !sources.includes("all")) {
    filteredSignalData = signalData.filter((item) => sources.includes(item[2]));
  }

  // Creates a set of unique indicators from the filtered data and then converts it to an array.
  const uniqueIndicators = [
    ...new Set(filteredSignalData.map((item) => item[3])),
  ];
  const checkboxGroup = document.getElementById(
    "indicatorFilter-checkbox-group"
  );
  checkboxGroup.innerHTML = "";

  // If the 'noData' class is present, it removes it.
  if (checkboxGroup.classList.contains("noData")) {
    checkboxGroup.classList.remove("noData");
  }

  // If there are no unique indicators, display a "No data available" message and add a 'noData' class.
  if (uniqueIndicators.length === 0) {
    checkboxGroup.className = "noData";
    checkboxGroup.innerHTML = "No data available";
    return; // Exit the function since there's nothing else to do
  }

  // Creates and adds an 'All' checkbox to the group that is checked by default.
  let allOption = document.createElement("input");
  allOption.type = "checkbox";
  allOption.id = "allFilter";
  allOption.name = "all"; // Add name to the checkbox
  allOption.value = "all"; // Add value to the checkbox
  allOption.checked = true; // Set as checked by default

  // Sets the properties of the checkbox...
  let allOptionLabel = document.createElement("label");
  allOptionLabel.htmlFor = "allFilter";
  allOptionLabel.appendChild(document.createTextNode("All"));

  checkboxGroup.appendChild(allOption);
  checkboxGroup.appendChild(allOptionLabel);
  checkboxGroup.appendChild(document.createElement("br")); // Added line break here

  // For each unique indicator, creates a checkbox and corresponding label, then adds them to the checkbox group.
  uniqueIndicators.forEach((indicator) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = indicator;
    checkbox.value = indicator;
    checkbox.id = `indicatorFilter-checkbox-${indicator}`;

    // Sets the properties of the checkbox...
    const label = document.createElement("label");
    label.htmlFor = `indicatorFilter-checkbox-${indicator}`;
    label.appendChild(document.createTextNode(indicator));

    checkboxGroup.appendChild(checkbox);
    checkboxGroup.appendChild(label);
    checkboxGroup.appendChild(document.createElement("br"));
  });

  // Adds an event listener to the checkbox group that triggers when any checkbox is checked or unchecked.
  // It modifies 'All' checkbox behavior, and updates the selected filters based on the checked checkboxes.
  checkboxGroup.addEventListener("change", function (event) {
    // Get all the checked checkboxes...
    let checkedBoxes = Array.from(checkboxGroup.children).filter(
      (child) => child.nodeName === "INPUT" && child.checked
    );
    // If 'all' checkbox is checked or unchecked, it changes the status of other checkboxes...
    if (event.target.id === "all") {
      if (event.target.checked) {
        // If "all" was checked, uncheck all other options
        Array.from(checkboxGroup.children)
          .filter(
            (child) => child !== event.target && child.nodeName === "INPUT"
          )
          .forEach((child) => (child.checked = false));
      } else {
        // If "all" was unchecked, and previously it was checked, check first available option
        const firstAvailableCheckbox = Array.from(checkboxGroup.children).find(
          (child) => child !== event.target && child.nodeName === "INPUT"
        );
        if (firstAvailableCheckbox) {
          firstAvailableCheckbox.checked = true;
        }
      }
    } else {
      if (event.target.checked) {
        // If it was checked, uncheck "all"
        checkboxGroup.children[0].checked = false;
      } else {
        // If it was unchecked, check if all others are also unchecked.
        // If so, check "all"
        const allUnchecked = Array.from(checkboxGroup.children)
          .filter((child) => child.nodeName === "INPUT")
          .every((child) => !child.checked);
        if (allUnchecked) {
          checkboxGroup.children[0].checked = true;

          // Update selectedFilters with all options
          selectedFilters = uniqueIndicators;
        }
      }
    }

    // Updates the 'selectedFilters' variable based on the checked checkboxes.
    selectedFilters = checkedBoxes.map((box) => box.value);
    if (selectedFilters.includes("all")) {
      selectedFilters = uniqueIndicators; // use all sources instead of ['all']
    }
  });
}

// Adds an event listener to the 'indicatorFilter-checkbox-group' that triggers when any checkbox is checked or unchecked.
// It updates the 'selectedFilters' variable by excluding 'all' option if other checkboxes are selected.
document
  .getElementById("indicatorFilter-checkbox-group")
  .addEventListener("change", async () => {
    const filterCheckboxes = document
      .getElementById("indicatorFilter-checkbox-group")
      .getElementsByTagName("input");

    // Filter out the 'all' option if other checkboxes are selected
    selectedFilters = Array.from(filterCheckboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    if (selectedFilters.includes("all") && selectedFilters.length > 1) {
      selectedFilters = selectedFilters.filter((filter) => filter !== "all");
    }
  });

// An event listener for 'currency' change. This function will be invoked when the value of the currency dropdown changes.
// When a different currency is selected, it triggers a series of updates for the application.
document.getElementById("currency").addEventListener("change", async () => {
  // Get the currently selected values of traderTable, currency, startDate, startTime, endDate, and endTime from the DOM.
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;
  let startDate = document.getElementById("startDateInput").value;
  let startTime = document.getElementById("startTimeInput").value;
  let endDate = document.getElementById("endDateInput").value;
  let endTime = document.getElementById("endTimeInput").value;

  // Format start and end dates with times into strings to be used in subsequent function calls.
  let startRange = `${startDate} ${startTime}`;
  let endRange = `${endDate} ${endTime}`;

  // Call the function 'populateIndicatorCheckboxGroup' to update the indicator checkboxes in the DOM.
  // The checkboxes should be populated based on the data associated with the selected traderTable and currency.
  populateIndicatorCheckboxGroup(traderTable, currency, startRange, endRange);

  // Call the function 'populateIndicatorFilterCheckboxGroup' to update the filter checkboxes in the DOM.
  // The checkboxes should be populated based on the data associated with the selected traderTable, currency, and filter.
  populateIndicatorFilterCheckboxGroup(
    traderTable,
    currency,
    startRange,
    endRange
  );

  // Load the mark line data with the new parameters.
  await loadMarkLineData(traderTable, currency, startRange, endRange);

  // Call the 'calculateDataPoints' function to recalculate the data points for the new parameters.
  calculateDataPoints(); // Add this
});

// currencyIdToStringMap is an object that maps currency ID to their string representation
let currencyIdToStringMap = {};

// The window.onload function initializes the page by setting up the current and starting dates,
// fetches the available currency pairs and populates the currency selection element.
// Additionally, it also sets up initial data for the page by loading mark line data, drawing
// the chart, and populating indicator checkbox groups.
window.onload = () => {
  const currentTime = new Date();

  const currentFormattedDate = currentTime.toISOString().slice(0, 10);
  document.getElementById("endDateInput").value = currentFormattedDate;

  const currentFormattedTime = currentTime.toTimeString().slice(0, 5);
  document.getElementById("endTimeInput").value = currentFormattedTime;

  currentTime.setMonth(currentTime.getMonth() - 2);
  const oneMonthAgoFormattedDate = currentTime.toISOString().slice(0, 10);
  document.getElementById("startDateInput").value = oneMonthAgoFormattedDate;
  document.getElementById("startTimeInput").value = "00:00";

  let startDate = document.getElementById("startDateInput").value;
  let startTime = document.getElementById("startTimeInput").value;
  let endDate = document.getElementById("endDateInput").value;
  let endTime = document.getElementById("endTimeInput").value;

  let startRange = `${startDate} ${startTime}`;
  let endRange = `${endDate} ${endTime}`;

  // Fetch initial data and draw the chart
  const traderTable = document.getElementById("traderTable").value;

  fetchIndicators(
    async (currencyData) => {
      const currencySelect = document.getElementById("currency");
      currencySelect.innerHTML = "";
      let firstOption = null;
      currencyData.forEach(([id, currency_name]) => {
        if (currency_name.includes("_")) {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = currency_name.replace("_", "/");
          currencySelect.appendChild(option);
          if (!firstOption) {
            firstOption = option;
          }
          // Add the currency to the map
          currencyIdToStringMap[id] = currency_name.replace("_", "/");
        }
      });

      if (firstOption) {
        firstOption.selected = true;
        document.getElementById("currency").value = 10; // This line is moved here.
        const currency = document.getElementById("currency").value;

        const source = document.getElementById(
          "indicator-checkbox-group"
        ).value;
        loadMarkLineData(traderTable, currency, startRange, endRange);
        // Fetch initial data and draw the chart
        fetchDataAndDrawChart(traderTable, currency, "all", "all");
        populateIndicatorCheckboxGroup(
          traderTable,
          currency,
          startRange,
          endRange
        );
        populateIndicatorFilterCheckboxGroup(
          traderTable,
          currency,
          startRange,
          endRange
        );
      } else {
        console.log("No valid currency options found");
      }
    },
    (error) => {
      console.error("An error occurred:", error);
    }
  );
};

// lineDataPoints is an array that will hold the available line data points calculated in the code
let lineDataPoints = [];

// This event listener is attached to the "fetchData" button, it's triggered when the button is clicked.
// It retrieves the selected values from the form, including trader table, currency, sources, and filters,
// then sets the start and end range values. Afterwards, it calls loadMarkLineData and fetchDataAndDrawChart
// functions to load mark line data and draw the chart based on the provided data respectively.
document.getElementById("fetchData").addEventListener("click", () => {
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;

  // For sources
  const sourceCheckboxes = document
    .getElementById("indicator-checkbox-group")
    .getElementsByTagName("input");
  const selectedSources = Array.from(sourceCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // For filters
  const filterCheckboxes = document
    .getElementById("indicatorFilter-checkbox-group")
    .getElementsByTagName("input");
  const selectedFilters = Array.from(filterCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  let startDate = document.getElementById("startDateInput").value;
  let startTime = document.getElementById("startTimeInput").value;
  let endDate = document.getElementById("endDateInput").value;
  let endTime = document.getElementById("endTimeInput").value;

  let startRange = `${startDate} ${startTime}`;
  let endRange = `${endDate} ${endTime}`;

  if (
    traderTable !== "trader_D" &&
    !traderTable.startsWith("trader_M1") &&
    !traderTable.startsWith("trader_M5") &&
    !traderTable.startsWith("trader_H")
  ) {
    startRange = startDate;
    endRange = endDate;
  }

  // Update available data variable
  loadMarkLineData(traderTable, currency, startRange, endRange).then(() => {
    calculateDataPoints();
  });

  fetchDataAndDrawChart(
    traderTable,
    currency,
    selectedSources,
    selectedFilters
  );
});

// updateDateRange function gets the selected values from the form, including trader table, currency,
// sources, and filters, and sets the start and end range values. Then it calls populateIndicatorCheckboxGroup,
// populateIndicatorFilterCheckboxGroup, loadMarkLineData, and calculateDataPoints functions to update
// the checkbox groups, load new mark line data and recalculate the line data points based on the
// new date range respectively.
document
  .getElementById("updateDateRange")
  .addEventListener("click", updateDateRange);
function updateDateRange() {
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;

  // For sources
  const sourceCheckboxes = document
    .getElementById("indicator-checkbox-group")
    .getElementsByTagName("input");
  const selectedSources = Array.from(sourceCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // For filters
  const filterCheckboxes = document
    .getElementById("indicatorFilter-checkbox-group")
    .getElementsByTagName("input");
  const selectedFilters = Array.from(filterCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  let startDate = document.getElementById("startDateInput").value;
  let startTime = document.getElementById("startTimeInput").value;
  let endDate = document.getElementById("endDateInput").value;
  let endTime = document.getElementById("endTimeInput").value;

  let startRange = `${startDate} ${startTime}`;
  let endRange = `${endDate} ${endTime}`;

  if (startRange && endRange) {
    startDate = startDateInput;
    endDate = endDateInput;
  } else {
    // Handle error: both inputs should be filled
    console.log("Please fill both date inputs");
  }

  populateIndicatorCheckboxGroup(traderTable, currency, startRange, endRange);
  populateIndicatorFilterCheckboxGroup(
    traderTable,
    currency,
    startRange,
    endRange
  );
  loadMarkLineData(traderTable, currency, startRange, endRange).then(() => {
    calculateDataPoints();
  });
}

// Declare markLineData in an outer scope
let markLineData;

// This function fetches the mark line data from a specified endpoint using
// traderTable, currency, startRange, and endRange as parameters.
// After fetching the data, it assigns listeners to "indicatorFilter-checkbox-group"
// and "indicator-checkbox-group" elements that trigger the calculateDataPoints function.
// It ends by invoking calculateDataPoints itself.
async function loadMarkLineData(traderTable, currency, startRange, endRange) {
  const signalResponse = await fetch(
    `${config.API_HOST}:${config.API_PORT}/nashsignals/${traderTable}/${currency}/${startRange}/${endRange}`
  );
  markLineData = await signalResponse.json();

  document
    .getElementById("indicatorFilter-checkbox-group")
    .addEventListener("change", calculateDataPoints);

  document
    .getElementById("indicator-checkbox-group")
    .addEventListener("change", calculateDataPoints);

  // When done, call calculateDataPoints
  calculateDataPoints(markLineData);
}

// The calculateDataPoints function filters the fetched markLineData based on
// selected filters and sources from "indicatorFilter-checkbox-group" and
// "indicator-checkbox-group" respectively. If 'all' is selected, it keeps all
// filters or sources depending on the case. Then, it calculates the number of line
// data points and updates the text of "fetchData" button accordingly. It returns
// the number of line data points.
async function calculateDataPoints() {
  if (!markLineData) {
    console.error("markLineData is not loaded yet!");
    return;
  }
  // Define the filters and sources
  let selectedFilters = Array.from(
    document
      .getElementById("indicatorFilter-checkbox-group")
      .getElementsByTagName("input")
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);
  let selectedSources = Array.from(
    document
      .getElementById("indicator-checkbox-group")
      .getElementsByTagName("input")
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // Check if 'all' is selected in the filters
  if (selectedFilters.includes("all") && selectedFilters.length > 1) {
    selectedFilters = selectedFilters.filter((filter) => filter !== "all");
  }
  // Check if 'all' is selected in the sources
  if (selectedSources.includes("all") && selectedSources.length > 1) {
    selectedSources = selectedSources.filter((source) => source !== "all");
  }

  // Filter the markLineData based on selectedFilters and selectedSources
  let markLineDataFiltered = markLineData;

  // Filter by source only if a specific source is selected
  if (selectedSources.length > 0 && !selectedSources.includes("all")) {
    markLineDataFiltered = markLineDataFiltered.filter(
      (data) => selectedSources.includes(data[2]) // 2 is the index for the source name
    );
  }

  // Filter by filters only if specific filters are selected
  if (selectedFilters.length > 0 && !selectedFilters.includes("all")) {
    markLineDataFiltered = markLineDataFiltered.filter(
      (data) => selectedFilters.includes(data[3]) // 3 is the index for the signal type (filter)
    );
  }

  // Calculate the number of line data points
  let lineDataPoints = markLineDataFiltered.length;

  // Update the fetchData button text
  document.getElementById(
    "fetchData"
  ).innerHTML = `Fetch Data <br>(${lineDataPoints})`;

  return lineDataPoints;
}

// This object stores the start and end time input values when they get hidden
// to be restored later when they're shown again.
let preservedTimeInputs = { start: "", end: "" };

// This event listener is triggered when the "traderTable" dropdown changes its value.
// It handles the visibility of start and end time inputs based on the selected interval.
// For intervals larger than 1 day, it hides the time inputs and preserves their values
// in preservedTimeInputs object. For intervals of 1 day or smaller, it shows the time
// inputs and restores their values from preservedTimeInputs object.
document.getElementById("traderTable").addEventListener("change", function () {
  const selectedInterval = this.value;
  const startTimeInput = document.getElementById("startTimeInput");
  const endTimeInput = document.getElementById("endTimeInput");

  // Show the time inputs if the selected interval is 1 day or smaller
  if (
    selectedInterval === "trader_D" ||
    selectedInterval.startsWith("trader_M1") ||
    selectedInterval.startsWith("trader_M5") ||
    selectedInterval.startsWith("trader_H")
  ) {
    startTimeInput.style.display = "inline";
    endTimeInput.style.display = "inline";

    // Restore preserved values
    startTimeInput.value = preservedTimeInputs.start;
    endTimeInput.value = preservedTimeInputs.end;
  } else {
    // Hide the time inputs for intervals larger than 1 day
    startTimeInput.style.display = "none";
    endTimeInput.style.display = "none";

    // Preserve current values
    preservedTimeInputs.start = startTimeInput.value;
    preservedTimeInputs.end = endTimeInput.value;

    // Clear the input values
    startTimeInput.value = "";
    endTimeInput.value = "";
  }
});

// Trigger the 'change' event manually to initialize the visibility of the time inputs
document.getElementById("traderTable").dispatchEvent(new Event("change"));

// Close the no data message when escape key is pressed
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("noDataMessage").style.display = "none";
  }
});

// Close the no data message when the close button is clicked
document.getElementById("closeMessage").addEventListener("click", () => {
  document.getElementById("noDataMessage").style.display = "none";
});

import config from "./config.js"; // assuming config.js and script.js are in the same directory
