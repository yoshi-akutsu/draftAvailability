function getAllCalendars() {
  let userEmail = Session.getActiveUser().getEmail();
  let calendars = CalendarApp.getAllCalendars();
  let calendarsNames = {};
  for (let i = 0; i < calendars.length; i++) {
    calendarsNames[calendars[i].getId()] = calendars[i].getName();
  }
  return [calendarsNames, userEmail];
}

function getUnavailability(calendarIds) {
  let calendars = [];
  for (let i = 0; i < calendarIds.length; i++) {
    calendars.push(CalendarApp.getCalendarById(calendarIds[i]));
  }
  let now = new Date();
  let threeWeeksFromNow = new Date(now.getTime() + (4 * 7 * 24 * 60 * 60 * 1000));
  let events = []
  for (let i = 0; i < calendars.length; i++) {
    let oneCalendarsEvents = calendars[i].getEvents(now, threeWeeksFromNow);
    for (let j = 0; j < oneCalendarsEvents.length; j++) {
      events.push(oneCalendarsEvents[j]);
    }
  }
  let eventTimes = [];
  for (let i = 0; i < events.length; i++) {
    let eventTime = [];
    eventTime.push(events[i].getStartTime());
    eventTime.push(events[i].getEndTime());
    eventTime.push(events[i].getTitle());
    eventTimes.push(eventTime);
  }
  let availability = processMeetingTimes(eventTimes);
  return availability;
}

function processMeetingTimes(meetingTimes) {
  let unavailability = [];
  let now = new Date();
  for (let i = 1; i < 22; i++) {
    let day = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000)).toDateString();
    let dayUnavailability = [];
    dayUnavailability.push(day);
    let dayMeetingTimes = [];
    for (let j = 0; j < meetingTimes.length; j++) {
      let dayMeeting = [];
      if (meetingTimes[j][0].toDateString() == day) {
        dayMeeting.push(meetingTimes[j][0].toTimeString());
        dayMeeting.push((meetingTimes[j][1] - meetingTimes[j][0]) / 60 / 60 / 1000);
        dayMeeting.push(meetingTimes[j][2]);
        dayMeetingTimes.push(dayMeeting);
      }
    }
    dayUnavailability.push(dayMeetingTimes);
    unavailability.push(dayUnavailability);
  }
   return getAvailability(unavailability);
}

function getAvailability(array) {
  let availabilityArray = [];
  for (let i = 0; i < array.length; i++) {
    let dayArray = [];
    dayArray.push(array[i][0]);
    if (array[i][0].split(" ")[0] == "Sat" || array[i][0].split(" ")[0] == "Sun") {
    }
    else {
      if (array[i][1].length == 0) {
        dayArray.push("10:00-20:00");
      }
      else {
        dayArray.push(processDayArray(array[i][1], array[i][0].split(" ")[0]))
      }
      availabilityArray.push(dayArray);
    }
  }
  return availabilityArray;
}

function sortDayArray(array) {
  let sortedArray = array.sort(function compareTimes(event1, event2) {
    if (Number(event2[0].split(" ")[0].split(":")[0]) > Number(event1[0].split(" ")[0].split(":")[0])) {
      return -1;
    }
    else if (Number(event2[0].split(" ")[0].split(":")[0]) == Number(event1[0].split(" ")[0].split(":")[0])){
      return 1;
    }
    else {
      return 1;
    }
  })
  return sortedArray;
}

function processDayArray(oneDayArray, dayOfWeek) {
  let dayArray = sortDayArray(oneDayArray);
  // Start building the string by concatenating the available times
  let dayAvailability = "00:00";
  for (let i = 0; i < dayArray.length; i++) {
    // Excludes all day events unless they mark the person as "out"
    if (dayArray[i][1] == 24.0) {
      if (dayArray[i][2].toLowerCase().includes("out")) {
        return "unavailable";
      }
    }
    else {
      // Concatenates the available windows
      let eventStartTime = dayArray[i][0].split(" ")[0].split(":")[0] + ":" + dayArray[i][0].split(" ")[0].split(":")[1];
      let eventEndTime = findEndTime(eventStartTime, dayArray[i][1]);
      dayAvailability = dayAvailability.concat("-", eventStartTime);
      dayAvailability = dayAvailability.concat(",", eventEndTime);
    }
  }
  
  dayAvailability = dayAvailability.concat("-", "23:59");
  
  let freeArray = dayAvailability.split(",");
  for (let i = 0; i < freeArray.length; i++) {
    if (freeArray[i].split("-")[0] == freeArray[i].split("-")[1]) {
      freeArray.splice(i, 1);
      i -= 1;
    }
    if (freeArray[i].split("-")[0].split(":")[0] > freeArray[i].split("-")[1].split(":")[0]) {
      freeArray.splice(i, 1);
    }
  }
  // Need to check each item of freeArray for length of time
  // Need to check the first and last items to adjust start and end times
  let flipped = false;
  for (let i = 0; i < freeArray.length; i++) {
    let minutesIntoMeetingStart = (Number(freeArray[i].split("-")[0].split(":")[0]) * 60) + Number(freeArray[i].split("-")[0].split(":")[1]);
    let minutesIntoMeetingEnd = (Number(freeArray[i].split("-")[1].split(":")[0]) * 60) + Number(freeArray[i].split("-")[1].split(":")[1]);
    if (minutesIntoMeetingEnd - minutesIntoMeetingStart < 45) {
      freeArray.splice(i, 1);
      i -= 1;
    }
    if (i == 0 && flipped == false) {
      flipped = true;
      let startTime = freeArray[i].split("-")[0];
      let endTime = freeArray[i].split("-")[1];
      if (Number(endTime.split(":")[0]) <= 10) {
        freeArray.splice(i, 1);
        i -= 1;
        //startTime = endTime;
        //endTime = freeArray[i + 1].split("-")[0];
      }
      else {
        startTime = "10:00";
      }
      freeArray[i] = startTime + "-" + endTime;
    }
    if (i == freeArray.length - 1) {
      let startTime = freeArray[i].split("-")[0];
      let endTime = freeArray[i].split("-")[1];
      if (dayOfWeek == "Fri") {
        if (Number(startTime.split(":")[0]) >= 18) {
          freeArray.pop()
        }
        else {
          endTime = "18:00";
          freeArray[i] = startTime + "-" + endTime;
        }
      }
      else {
        if (Number(startTime.split(":")[0]) >= 20) {
          freeArray.pop()
        }
        else {
          endTime = "20:30";
          freeArray[i] = startTime + "-" + endTime;    
        }
      }
    }
  }
  for (let i = 0; i < freeArray.length; i++) {
    freeArray[i] = militaryToTwelveHour(freeArray[i]);
  }
  dayAvailability = freeArray.join(", ");
  return dayAvailability;
}

function militaryToTwelveHour(timeRange) {
  let start = timeRange.split("-")[0].split(":")[0];
  let end = timeRange.split("-")[1].split(":")[0];
  if (start > 12) {
    start = Number(start) - 12 + ":" + timeRange.split("-")[0].split(":")[1] + "pm";
  }
  else if (start == 12) {
    start = start + ":" + timeRange.split("-")[0].split(":")[1] + "pm";
  }
  else {
    start = start + ":" + timeRange.split("-")[0].split(":")[1] + "am";
  }

  if (end > 12) {
    end = Number(end) - 12 + ":" + timeRange.split("-")[0].split(":")[1] + "pm";
  }
  else if (end == 12) {
    end = end + ":" + timeRange.split("-")[0].split(":")[1] + "pm";
  }
  else {
    end = end + ":" + timeRange.split("-")[0].split(":")[1] + "am";
  }
  return start.concat("-", end);
}

function findEndTime(startTime, timeLength) {
  let minutes = timeLength * 60;
  let endTimeHours = Number(startTime.split(":")[0]);
  let endTimeMinutes = Number(startTime.split(":")[1]) + minutes;
  while (endTimeMinutes >= 60) {
    endTimeHours += 1;
    endTimeMinutes -= 60;
  }
  if (endTimeMinutes.toString().length < 2) {
    endTimeMinutes = endTimeMinutes.toString() + "0";
  }
  let endTime = endTimeHours + ":" + endTimeMinutes;
  return endTime;
}

// Allows separate html pages to be included
function include(filename){
   return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Initializes web app
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}